import type Phaser from "phaser";
import { assetUrl } from "../assets/paths";
import { BASE_FIGHTERS, FIGHTER_BY_ID } from "../content/fighters";
import { createTournament, simulateTournamentFromState } from "../simulation/systems/tournament";
import type {
  BattleLogEntry,
  BattleReplay,
  BracketMatch,
  BracketSlot,
  CharacterId,
  Fighter,
  RoundName,
  TournamentReplay,
  TournamentState,
} from "../simulation/types";
import { ATTACK_LABELS, DEFENSE_LABELS, ROUND_LABELS } from "./labels";

type AppMode = "title" | "select" | "bracket" | "battle";

interface AppController {
  destroy(): void;
}

interface UiRefs {
  homeButton: HTMLButtonElement;
  pauseButton: HTMLButtonElement;
  stage: HTMLElement;
  gameRoot: HTMLElement;
  logPanel: HTMLElement;
  log: HTMLElement;
}

const SCENE_KEYS = ["MenuScene", "TournamentScene", "BattleScene", "ResultScene"];
const PRELOADED_IMAGES = new Set<string>();

function makeSeed() {
  const random = new Uint32Array(1);
  globalThis.crypto?.getRandomValues(random);
  const suffix = random[0] ? random[0].toString(36) : Date.now().toString(36);
  return `wuxia-${Date.now().toString(36)}-${suffix}`;
}

function fighterLabel(fighterId: CharacterId | null) {
  if (!fighterId) {
    return "대기";
  }
  const fighter = FIGHTER_BY_ID[fighterId];
  return `${fighter.title} ${fighter.name}`;
}

function preloadImage(path: string) {
  if (PRELOADED_IMAGES.has(path)) {
    return;
  }
  PRELOADED_IMAGES.add(path);
  const image = new Image();
  image.src = path;
}

function isByeMatch(match: BracketMatch) {
  return Boolean((match.left && !match.right) || (!match.left && match.right));
}

function getOpeningRound(slots: BracketSlot[]): RoundName {
  if (slots.length === 16) {
    return "RoundOf16";
  }
  if (slots.length === 2) {
    return "Final";
  }
  if (slots.length === 4) {
    return "Semifinal";
  }
  return "Quarterfinal";
}

export function mountApp(root: HTMLElement, game: Phaser.Game): AppController {
  root.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Pixel Wuxia Auto Tournament</p>
          <h1>무협 슬롯 토너먼트</h1>
        </div>
        <div class="controls">
          <button id="home-button">타이틀</button>
          <button id="pause-button" disabled>일시정지</button>
        </div>
      </header>
      <main class="layout">
        <section class="arena-panel">
          <div id="dom-stage" class="view-stage"></div>
          <div id="game-root" class="game-root is-hidden"></div>
          <section id="battle-log-panel" class="battle-log-panel is-hidden">
            <div class="section-heading">
              <h2>판정 로그</h2>
              <span>최근 판정이 위로 쌓입니다</span>
            </div>
            <div id="log" class="log"></div>
          </section>
        </section>
      </main>
    </div>
  `;

  const refs: UiRefs = {
    homeButton: root.querySelector("#home-button") as HTMLButtonElement,
    pauseButton: root.querySelector("#pause-button") as HTMLButtonElement,
    stage: root.querySelector("#dom-stage") as HTMLElement,
    gameRoot: root.querySelector("#game-root") as HTMLElement,
    logPanel: root.querySelector("#battle-log-panel") as HTMLElement,
    log: root.querySelector("#log") as HTMLElement,
  };

  refs.gameRoot.appendChild(game.canvas);

  let mode: AppMode = "title";
  let currentSeed = makeSeed();
  let selectedFighterId: CharacterId = BASE_FIGHTERS[0].id;
  let entryIds: CharacterId[] = [];
  let tournament: TournamentState | null = null;
  let replay: TournamentReplay | null = null;
  let completedMatchIds = new Set<string>();
  let battleIndex = 0;
  let paused = false;
  let advanceTimer: number | null = null;
  let selectRevealTimer: number | null = null;
  let selectRevealToken = 0;
  let selectMediaFighterId: CharacterId | null = null;

  function appendLog(text: string) {
    const entry = document.createElement("p");
    entry.textContent = text;
    refs.log.prepend(entry);
  }

  function clearTimers() {
    if (advanceTimer) {
      window.clearTimeout(advanceTimer);
      advanceTimer = null;
    }
    if (selectRevealTimer) {
      window.clearTimeout(selectRevealTimer);
      selectRevealTimer = null;
    }
    selectRevealToken += 1;
    refs.stage.querySelector<HTMLVideoElement>("[data-select-profile-video]")?.pause();
  }

  function stopPhaserScenes() {
    for (const key of SCENE_KEYS) {
      if (game.scene.isActive(key) || game.scene.isPaused(key) || game.scene.isSleeping(key)) {
        game.scene.stop(key);
      }
    }
  }

  function switchScene(sceneKey: string) {
    stopPhaserScenes();
    game.scene.start(sceneKey);
  }

  function setMode(nextMode: AppMode) {
    mode = nextMode;
    const isBattle = nextMode === "battle";
    refs.stage.classList.toggle("is-hidden", isBattle);
    refs.gameRoot.classList.toggle("is-hidden", !isBattle);
    refs.logPanel.classList.toggle("is-hidden", !isBattle);
    refs.homeButton.disabled = nextMode === "title";
    refs.pauseButton.disabled = !isBattle;
    if (!isBattle) {
      paused = false;
      refs.pauseButton.textContent = "일시정지";
    } else {
      game.scale.refresh();
    }
  }

  function resetTournament() {
    clearTimers();
    tournament = null;
    replay = null;
    completedMatchIds = new Set<string>();
    battleIndex = 0;
    paused = false;
    refs.log.innerHTML = "";
    game.registry.remove("battleReplay");
    game.registry.remove("champion");
    stopPhaserScenes();
  }

  function renderTitle() {
    setMode("title");
    refs.stage.innerHTML = `
      <section class="title-screen">
        <div class="title-copy">
          <p class="eyebrow">Wuxia Slot Fight</p>
          <h2>무협 슬롯 토너먼트</h2>
          <p>엔트리를 구성하고 슬롯 릴의 운으로 토너먼트의 승자를 가립니다.</p>
          <button class="big-action" data-action="open-select">캐릭터 선택</button>
        </div>
      </section>
    `;
  }

  function renderSelect() {
    setMode("select");
    for (const fighter of BASE_FIGHTERS) {
      preloadImage(assetUrl(fighter.portraitPath));
      preloadImage(assetUrl(fighter.portraitThumbPath));
      if (fighter.selectFinalPortraitPath) {
        preloadImage(assetUrl(fighter.selectFinalPortraitPath));
      }
    }
    const selected = FIGHTER_BY_ID[selectedFighterId];
    const isRegistered = entryIds.includes(selectedFighterId);
    const canStart = entryIds.length >= 2;

    refs.stage.innerHTML = `
      <section class="character-select-screen">
        <div class="select-heading">
          <div>
            <p class="eyebrow">Character Select</p>
            <h2>출전 엔트리 구성</h2>
          </div>
          <strong data-select-count>${entryIds.length} / ${BASE_FIGHTERS.length}</strong>
        </div>
        <div class="select-layout">
          <aside class="profile-panel select-profile">
            <div class="select-media" data-select-media>
              <img class="select-media-layer is-visible" data-select-profile-image src="${assetUrl(selected.portraitPath)}" alt="${selected.title} ${selected.name}" />
              <video class="select-media-layer" data-select-profile-video muted playsinline preload="auto"></video>
              <img class="select-media-layer" data-select-final-image src="${assetUrl(selected.selectFinalPortraitPath ?? selected.portraitPath)}" alt="${selected.title} ${selected.name} 최종 이미지" />
            </div>
            <div>
              <p data-select-profile-title>${selected.title}</p>
              <h3 data-select-profile-name>${selected.name}</h3>
              <span data-select-profile-concept>${selected.concept}</span>
            </div>
            <button data-action="register-entry" data-select-register ${isRegistered ? "disabled" : ""}>${isRegistered ? "등록 완료" : "엔트리 등록"}</button>
          </aside>
          <section class="fighter-pool">
            ${BASE_FIGHTERS.map((fighter) => {
              const active = fighter.id === selectedFighterId;
              const registered = entryIds.includes(fighter.id);
              return `
                <button class="select-card ${active ? "active" : ""} ${registered ? "registered" : ""}" data-action="select-fighter" data-fighter-id="${fighter.id}">
                  <img src="${assetUrl(fighter.portraitThumbPath)}" alt="${fighter.title} ${fighter.name}" />
                  <span>
                    <strong>${fighter.title} ${fighter.name}</strong>
                    <small>${fighter.concept}</small>
                  </span>
                  ${registered ? "<i>ENTRY</i>" : ""}
                </button>
              `;
            }).join("")}
          </section>
          <aside class="entry-panel">
              <div class="section-heading">
                <h2>선택한 캐릭터</h2>
                <span>최소 2명 필요</span>
              </div>
              <div class="entry-list" data-select-entry-list>${renderEntryListHtml()}</div>
              <button class="start-entry-button" data-action="start-entry" data-select-start ${canStart ? "" : "disabled"}>게임 시작</button>
          </aside>
        </div>
      </section>
    `;
    showStaticSelectMedia(selected);
    updateSelectView();
  }

  function getSelectMediaRefs() {
    return {
      profileImage: refs.stage.querySelector<HTMLImageElement>("[data-select-profile-image]"),
      video: refs.stage.querySelector<HTMLVideoElement>("[data-select-profile-video]"),
      finalImage: refs.stage.querySelector<HTMLImageElement>("[data-select-final-image]"),
    };
  }

  function setSelectMediaLayer(layer: "profile" | "video" | "final" | null) {
    const { profileImage, video, finalImage } = getSelectMediaRefs();
    profileImage?.classList.toggle("is-visible", layer === "profile");
    video?.classList.toggle("is-visible", layer === "video");
    finalImage?.classList.toggle("is-visible", layer === "final");
  }

  function configureSelectMedia(fighter: Fighter) {
    const { profileImage, video, finalImage } = getSelectMediaRefs();
    if (profileImage) {
      profileImage.src = assetUrl(fighter.portraitPath);
      profileImage.alt = `${fighter.title} ${fighter.name}`;
    }
    if (finalImage) {
      finalImage.src = assetUrl(fighter.selectFinalPortraitPath ?? fighter.portraitPath);
      finalImage.alt = `${fighter.title} ${fighter.name} 최종 이미지`;
    }
    if (video) {
      video.pause();
      video.onended = null;
      video.onerror = null;
      if (fighter.selectIntroVideoPath) {
        const introVideoPath = assetUrl(fighter.selectIntroVideoPath);
        if (video.getAttribute("src") !== introVideoPath) {
          video.src = introVideoPath;
          video.load();
        }
      } else {
        video.removeAttribute("src");
        video.load();
      }
    }
    selectMediaFighterId = fighter.id;
  }

  function showSelectProfileImmediately(fighter: Fighter) {
    const { profileImage, video, finalImage } = getSelectMediaRefs();
    const layers = [profileImage, video, finalImage].filter(Boolean) as HTMLElement[];
    for (const layer of layers) {
      layer.style.transition = "none";
      layer.classList.remove("is-visible");
    }

    configureSelectMedia(fighter);
    profileImage?.classList.add("is-visible");
    void profileImage?.offsetHeight;

    for (const layer of layers) {
      layer.style.transition = "";
    }
  }

  function showStaticSelectMedia(fighter: Fighter) {
    selectRevealToken += 1;
    if (selectRevealTimer) {
      window.clearTimeout(selectRevealTimer);
      selectRevealTimer = null;
    }
    showSelectProfileImmediately(fighter);
  }

  function finishSelectReveal(token: number) {
    const { video } = getSelectMediaRefs();
    if (token !== selectRevealToken) {
      return;
    }
    video?.pause();
    setSelectMediaLayer(null);
    selectRevealTimer = window.setTimeout(() => {
      if (token === selectRevealToken) {
        setSelectMediaLayer("final");
      }
    }, 560);
  }

  function playSelectReveal(fighter: Fighter) {
    if (!fighter.selectIntroVideoPath || !fighter.selectFinalPortraitPath) {
      showStaticSelectMedia(fighter);
      return;
    }

    const token = selectRevealToken + 1;
    selectRevealToken = token;
    if (selectRevealTimer) {
      window.clearTimeout(selectRevealTimer);
      selectRevealTimer = null;
    }
    showSelectProfileImmediately(fighter);
    const { video } = getSelectMediaRefs();

    selectRevealTimer = window.setTimeout(() => {
      if (token !== selectRevealToken || !video) {
        return;
      }

      setSelectMediaLayer(null);
      selectRevealTimer = window.setTimeout(() => {
        if (token !== selectRevealToken) {
          return;
        }
        video.currentTime = 0;
        video.onended = () => finishSelectReveal(token);
        video.onerror = () => finishSelectReveal(token);
        setSelectMediaLayer("video");
        void video.play().catch(() => finishSelectReveal(token));
      }, 560);
    }, 2000);
  }

  function renderEntryListHtml() {
    if (!entryIds.length) {
      return '<p class="empty-entry">등록된 캐릭터가 없습니다.</p>';
    }

    return entryIds
      .map((fighterId, index) => {
        const fighter = FIGHTER_BY_ID[fighterId];
        return `
          <div class="entry-row">
            <span>${index + 1}</span>
            <img src="${assetUrl(fighter.portraitThumbPath)}" alt="${fighter.title} ${fighter.name}" />
            <strong>${fighter.title} ${fighter.name}</strong>
            <button data-action="remove-entry" data-fighter-id="${fighter.id}" aria-label="${fighter.title} ${fighter.name} 제거">×</button>
          </div>
        `;
      })
      .join("");
  }

  function updateSelectView(playReveal = false) {
    if (mode !== "select") {
      return;
    }

    const selected = FIGHTER_BY_ID[selectedFighterId];
    const isRegistered = entryIds.includes(selectedFighterId);
    const canStart = entryIds.length >= 2;
    if (playReveal) {
      playSelectReveal(selected);
    } else if (selectMediaFighterId !== selected.id) {
      showStaticSelectMedia(selected);
    }
    const title = refs.stage.querySelector<HTMLElement>("[data-select-profile-title]");
    const name = refs.stage.querySelector<HTMLElement>("[data-select-profile-name]");
    const concept = refs.stage.querySelector<HTMLElement>("[data-select-profile-concept]");
    const count = refs.stage.querySelector<HTMLElement>("[data-select-count]");
    const registerButton = refs.stage.querySelector<HTMLButtonElement>("[data-select-register]");
    const startButton = refs.stage.querySelector<HTMLButtonElement>("[data-select-start]");
    const entryList = refs.stage.querySelector<HTMLElement>("[data-select-entry-list]");

    if (title) {
      title.textContent = selected.title;
    }
    if (name) {
      name.textContent = selected.name;
    }
    if (concept) {
      concept.textContent = selected.concept;
    }
    if (count) {
      count.textContent = `${entryIds.length} / ${BASE_FIGHTERS.length}`;
    }
    if (registerButton) {
      registerButton.disabled = isRegistered;
      registerButton.textContent = isRegistered ? "등록 완료" : "엔트리 등록";
    }
    if (startButton) {
      startButton.disabled = !canStart;
    }
    if (entryList) {
      entryList.innerHTML = renderEntryListHtml();
    }

    refs.stage.querySelectorAll<HTMLElement>(".select-card[data-fighter-id]").forEach((card) => {
      const fighterId = card.dataset.fighterId as CharacterId;
      const registered = entryIds.includes(fighterId);
      card.classList.toggle("active", fighterId === selectedFighterId);
      card.classList.toggle("registered", registered);
      const badge = card.querySelector("i");
      if (registered && !badge) {
        const entryBadge = document.createElement("i");
        entryBadge.textContent = "ENTRY";
        card.appendChild(entryBadge);
      }
      if (!registered && badge) {
        badge.remove();
      }
    });
  }

  function getCompletedMatches() {
    if (!replay) {
      return [];
    }
    return replay.matches.filter((match) => completedMatchIds.has(match.id));
  }

  function getWinner(matches: BracketMatch[], round: RoundName, index: number): CharacterId | null {
    return matches.find((match) => match.round === round && match.index === index)?.winner ?? null;
  }

  function renderSeedCell(slot: BracketSlot) {
    const label = slot.fighterId ? fighterLabel(slot.fighterId) : "부전승";
    const portrait = slot.fighterId ? `<img src="${assetUrl(FIGHTER_BY_ID[slot.fighterId].portraitThumbPath)}" alt="${label}" />` : "<i></i>";
    return `<div class="bracket-cell ${slot.isBye ? "bye" : ""}"><span>${slot.slot + 1}</span>${portrait}<strong>${label}</strong></div>`;
  }

  function renderAdvanceCell(label: string, fighterId: CharacterId | null, tone = "") {
    const portrait = fighterId ? `<img src="${assetUrl(FIGHTER_BY_ID[fighterId].portraitThumbPath)}" alt="${fighterLabel(fighterId)}" />` : "<i></i>";
    return `<div class="bracket-cell advance ${tone} ${fighterId ? "" : "placeholder"}"><span>${label}</span>${portrait}<strong>${fighterLabel(fighterId)}</strong></div>`;
  }

  function renderBracketDiagram(slots: BracketSlot[], matches: BracketMatch[]) {
    const openingRound = getOpeningRound(slots);
    const champion = getWinner(matches, "Final", 0);
    const columns = [
      `
        <div class="bracket-column seeds">
          <div class="round-title">${ROUND_LABELS[openingRound]}</div>
          ${slots.map(renderSeedCell).join("")}
        </div>
      `,
    ];

    if (slots.length === 16) {
      const quarterfinalists = Array.from({ length: 8 }, (_, index) => getWinner(matches, "RoundOf16", index));
      const semifinalists = [0, 1, 2, 3].map((index) => getWinner(matches, "Quarterfinal", index));
      const finalists = [0, 1].map((index) => getWinner(matches, "Semifinal", index));
      columns.push(`
        <div class="bracket-column quarterfinals">
          <div class="round-title">1회전</div>
          ${quarterfinalists.map((fighterId, index) => renderAdvanceCell(`Q${index + 1}`, fighterId)).join("")}
        </div>
      `);
      columns.push(`
        <div class="bracket-column semifinals">
          <div class="round-title">준결승</div>
          ${semifinalists.map((fighterId, index) => renderAdvanceCell(`S${index + 1}`, fighterId)).join("")}
        </div>
      `);
      columns.push(`
        <div class="bracket-column finals">
          <div class="round-title">결승</div>
          ${renderAdvanceCell("F1", finalists[0])}
          ${renderAdvanceCell("F2", finalists[1])}
        </div>
      `);
    }

    if (slots.length === 8) {
      const semifinalists = [0, 1, 2, 3].map((index) => getWinner(matches, "Quarterfinal", index));
      const finalists = [0, 1].map((index) => getWinner(matches, "Semifinal", index));
      columns.push(`
        <div class="bracket-column semifinals">
          <div class="round-title">준결승</div>
          ${renderAdvanceCell("S1", semifinalists[0])}
          ${renderAdvanceCell("S2", semifinalists[1])}
          ${renderAdvanceCell("S3", semifinalists[2])}
          ${renderAdvanceCell("S4", semifinalists[3])}
        </div>
      `);
      columns.push(`
        <div class="bracket-column finals">
          <div class="round-title">결승</div>
          ${renderAdvanceCell("F1", finalists[0])}
          ${renderAdvanceCell("F2", finalists[1])}
        </div>
      `);
    }

    if (slots.length === 4) {
      const finalists = [0, 1].map((index) => getWinner(matches, "Semifinal", index));
      columns.push(`
        <div class="bracket-column finals">
          <div class="round-title">결승</div>
          ${renderAdvanceCell("F1", finalists[0])}
          ${renderAdvanceCell("F2", finalists[1])}
        </div>
      `);
    }

    columns.push(`
      <div class="bracket-column champion">
        <div class="round-title">우승</div>
        ${renderAdvanceCell("WIN", champion, "winner")}
      </div>
    `);

    return `<div class="bracket-diagram bracket-size-${slots.length}">${columns.join("")}</div>`;
  }

  function showBracket(title: string, subtitle: string, autoAdvance: boolean) {
    if (!tournament) {
      return;
    }

    clearTimers();
    stopPhaserScenes();
    setMode("bracket");
    const completedMatches = getCompletedMatches();
    const champion = replay?.champion && getWinner(completedMatches, "Final", 0) ? FIGHTER_BY_ID[replay.champion] : null;

    refs.stage.innerHTML = `
      <section class="bracket-screen">
        <div class="bracket-headline">
          <div>
            <p class="eyebrow">Tournament Bracket</p>
            <h2>${title}</h2>
            <span>${subtitle}</span>
          </div>
          ${champion ? `<strong>우승 ${champion.title} ${champion.name}</strong>` : ""}
        </div>
        ${renderBracketDiagram(tournament.slots, completedMatches)}
        <div class="bracket-actions">
          ${
            autoAdvance
              ? '<span class="auto-note">잠시 후 다음 경기로 이동합니다.</span>'
              : '<button data-action="open-select">새 엔트리 구성</button>'
          }
        </div>
      </section>
    `;

    if (autoAdvance) {
      advanceTimer = window.setTimeout(playNextBattle, 1800);
    }
  }

  function startEntryTournament() {
    if (entryIds.length < 2) {
      return;
    }

    resetTournament();
    currentSeed = makeSeed();
    tournament = createTournament(currentSeed, entryIds);
    replay = simulateTournamentFromState(currentSeed, tournament);
    completedMatchIds = new Set(replay.matches.filter(isByeMatch).map((match) => match.id));
    battleIndex = 0;
    appendLog("토너먼트가 시작되었습니다.");
    showBracket("대진표 공개", "등록한 엔트리로 토너먼트를 구성했습니다.", true);
  }

  function playNextBattle() {
    if (!replay || paused) {
      return;
    }

    const battle = replay.battles[battleIndex];
    if (!battle) {
      showBracket("토너먼트 종료", `${fighterLabel(replay.champion)}이 최종 우승했습니다.`, false);
      return;
    }

    clearTimers();
    game.registry.set("battleReplay", battle);
    setMode("battle");
    switchScene("BattleScene");
  }

  function onTurnResolved(event: Event) {
    const detail = (event as CustomEvent<BattleLogEntry>).detail;
    appendLog(
      `${detail.turn}턴 ${fighterLabel(detail.attacker)}: ${ATTACK_LABELS[detail.attackAction]} / ${fighterLabel(detail.defender)}: ${DEFENSE_LABELS[detail.defenseAction]} / 피해 ${detail.targetDamage}, 반사 ${detail.reflectedDamage}`,
    );
  }

  function onBattleComplete(event: Event) {
    if (!replay) {
      return;
    }

    const detail = (event as CustomEvent<BattleReplay>).detail;
    const completedMatch = replay.matches.find((match) => match.id === detail.matchId);
    if (completedMatch) {
      completedMatchIds.add(completedMatch.id);
    }
    appendLog(`${ROUND_LABELS[detail.round]} 종료: ${fighterLabel(detail.winner)} 승리`);
    battleIndex += 1;

    const isComplete = battleIndex >= replay.battles.length;
    showBracket(
      isComplete ? "최종 결과" : "대진표 결과 반영",
      isComplete ? `${fighterLabel(replay.champion)}이 우승했습니다.` : "승자를 반영한 뒤 다음 경기로 이동합니다.",
      !isComplete,
    );
  }

  function togglePause() {
    if (mode !== "battle") {
      return;
    }
    paused = !paused;
    refs.pauseButton.textContent = paused ? "재개" : "일시정지";
    if (paused) {
      game.scene.pause("BattleScene");
      return;
    }
    game.scene.resume("BattleScene");
  }

  function onStageClick(event: MouseEvent) {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target) {
      return;
    }

    const action = target.dataset.action;
    const fighterId = target.dataset.fighterId as CharacterId | undefined;

    if (action === "open-select") {
      resetTournament();
      renderSelect();
      return;
    }

    if (action === "select-fighter" && fighterId) {
      selectedFighterId = fighterId;
      updateSelectView(true);
      return;
    }

    if (action === "register-entry") {
      if (!entryIds.includes(selectedFighterId)) {
        entryIds = [...entryIds, selectedFighterId];
      }
      updateSelectView();
      return;
    }

    if (action === "remove-entry" && fighterId) {
      entryIds = entryIds.filter((entryId) => entryId !== fighterId);
      updateSelectView();
      return;
    }

    if (action === "start-entry") {
      startEntryTournament();
    }
  }

  function goTitle() {
    resetTournament();
    renderTitle();
  }

  renderTitle();

  refs.homeButton.addEventListener("click", goTitle);
  refs.pauseButton.addEventListener("click", togglePause);
  refs.stage.addEventListener("click", onStageClick);
  window.addEventListener("battle-turn-resolved", onTurnResolved);
  window.addEventListener("battle-complete", onBattleComplete);

  return {
    destroy() {
      clearTimers();
      refs.homeButton.removeEventListener("click", goTitle);
      refs.pauseButton.removeEventListener("click", togglePause);
      refs.stage.removeEventListener("click", onStageClick);
      window.removeEventListener("battle-turn-resolved", onTurnResolved);
      window.removeEventListener("battle-complete", onBattleComplete);
    },
  };
}
