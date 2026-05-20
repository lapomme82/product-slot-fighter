import Phaser from "phaser";
import {
  CHARACTER_FRAME_COUNT,
  type CharacterMotion,
  getAtlasAnimationName,
  getAtlasFrameMetadata,
  getAnimationFrameKey,
  getSpriteAtlasFrameKey,
  motionForAttack,
  motionForDefense,
} from "../../assets/characterAnimations";
import { FIGHTER_BY_ID } from "../../content/fighters";
import type {
  AttackReelSymbol,
  BattleLogEntry,
  BattleReplay,
  CharacterId,
  DefenseReelSymbol,
  Fighter,
} from "../../simulation/types";
import {
  SLOT_REEL_CENTER_Y,
  SLOT_REEL_ICON_SCALE,
  createFighterView,
  type FighterView,
} from "../view/fighterSprite";

const ATTACK_ICON_KEYS: Record<AttackReelSymbol, string> = {
  WeakAttack: "slot-weak-attack",
  StrongAttack: "slot-strong-attack",
  Special: "slot-special",
};

const DEFENSE_ICON_KEYS: Record<DefenseReelSymbol, string> = {
  Block: "slot-block",
  Dodge: "slot-dodge",
  Counter: "slot-counter",
  RainbowReflect: "slot-grand-counter",
};

const ATTACK_LABELS = {
  WeakAttack: "약공격",
  StrongAttack: "강공격",
  AttackFail: "공격 꽝",
  Special: "필살기",
} as const;

const DEFENSE_LABELS = {
  Block: "방어",
  Dodge: "회피",
  Counter: "반격",
  DefenseFail: "방어 꽝",
  RainbowReflect: "대반격",
} as const;

interface HudView {
  leftBar: Phaser.GameObjects.Rectangle;
  rightBar: Phaser.GameObjects.Rectangle;
  leftHpText: Phaser.GameObjects.Text;
  rightHpText: Phaser.GameObjects.Text;
}

interface MotionPlaybackOptions {
  returnToIdle?: boolean;
}

export class BattleScene extends Phaser.Scene {
  private replay: BattleReplay | null = null;
  private views = new Map<CharacterId, FighterView>();
  private hp = new Map<CharacterId, number>();
  private awakenedFighterIds = new Set<CharacterId>();
  private turnIndex = 0;
  private hud: HudView | null = null;
  private battleFlowToken = 0;
  private finishStarted = false;

  constructor() {
    super("BattleScene");
  }

  create() {
    this.replay = this.registry.get("battleReplay") as BattleReplay;
    this.awakenedFighterIds = new Set((this.registry.get("awakenedFighterIds") as CharacterId[] | undefined) ?? []);
    this.views.clear();
    this.hp.clear();
    this.turnIndex = 0;
    this.hud = null;
    this.battleFlowToken += 1;
    this.finishStarted = false;
    this.cameras.main.setBackgroundColor(0x07080c);
    this.createArena();
    this.createTopHud();
    this.createFighters();
    const flowToken = this.battleFlowToken;
    this.time.delayedCall(260, () => {
      void this.playOpeningFlow(flowToken);
    });
  }

  private createArena() {
    const { width, height } = this.scale;
    const stage = this.add.image(width / 2, height / 2, "stage-finance-center");
    const stageScale = Math.max(width / stage.width, height / stage.height);
    stage.setScale(stageScale);
    this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.2);
    this.add.rectangle(width / 2, 76, width, 140, 0x020617, 0.38);
    this.add.rectangle(width / 2, height - 75, width, 112, 0x120905, 0.34);
    this.add.rectangle(width / 2, height - 70, width, 8, 0xfacc15, 0.5);
    this.add.rectangle(width / 2, height - 185, width, 96, 0x0f172a, 0.12);
    this.add.circle(width / 2, 164, 66, 0x7f1d1d, 0.34);
    this.add.circle(width / 2, 164, 42, 0xfacc15, 0.08);
  }

  private createTopHud() {
    if (!this.replay) {
      return;
    }

    const { width } = this.scale;
    const left = FIGHTER_BY_ID[this.replay.left];
    const right = FIGHTER_BY_ID[this.replay.right];
    const panelY = 28;
    const hpY = 82;

    this.add.rectangle(width / 2, 76, width - 40, 116, 0x0b0f19, 0.86).setStrokeStyle(2, 0x8b5a2b);
    this.drawPortrait(left, 86, 76);
    this.drawPortrait(right, width - 86, 76);

    this.add
      .text(142, panelY, this.fighterLabel(left), {
        fontFamily: "sans-serif",
        fontSize: "18px",
        color: "#fff7d6",
      })
      .setOrigin(0, 0.5);
    this.add
      .text(width - 142, panelY, this.fighterLabel(right), {
        fontFamily: "sans-serif",
        fontSize: "18px",
        color: "#fff7d6",
      })
      .setOrigin(1, 0.5);

    this.add.rectangle(302, hpY, 322, 20, 0x2a1714).setStrokeStyle(2, 0x57341f);
    this.add.rectangle(width - 302, hpY, 322, 20, 0x2a1714).setStrokeStyle(2, 0x57341f);
    const leftBar = this.add.rectangle(141, hpY, 322, 16, 0x16a34a).setOrigin(0, 0.5);
    const rightBar = this.add.rectangle(width - 141, hpY, 322, 16, 0x16a34a).setOrigin(1, 0.5);
    const leftHpText = this.add
      .text(302, hpY + 30, `${left.maxHp} / ${left.maxHp}`, {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: "#d6f7de",
      })
      .setOrigin(0.5);
    const rightHpText = this.add
      .text(width - 302, hpY + 30, `${right.maxHp} / ${right.maxHp}`, {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: "#d6f7de",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 42, this.roundLabel(this.replay.round), {
        fontFamily: "serif",
        fontSize: "22px",
        color: "#facc15",
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 82, "VS", {
        fontFamily: "serif",
        fontSize: "34px",
        color: "#ffffff",
        stroke: "#7f1d1d",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.hud = { leftBar, rightBar, leftHpText, rightHpText };
  }

  private drawPortrait(fighter: Fighter, x: number, y: number) {
    this.add.rectangle(x, y, 100, 100, 0x141414).setDepth(1);
    const portraitKey =
      this.awakenedFighterIds.has(fighter.id) && fighter.awakened
        ? `${fighter.portraitKey}-awakened`
        : fighter.portraitKey;
    const portrait = this.add.image(x, y, portraitKey).setDepth(2);
    this.fitImageInside(portrait, 92, 92);
    this.add.rectangle(x, y, 96, 96, fighter.palette.accent, 0.08).setDepth(3);
    this.add.rectangle(x, y, 100, 100, 0x000000, 0).setStrokeStyle(4, fighter.palette.accent).setDepth(4);
    if (this.awakenedFighterIds.has(fighter.id)) {
      this.add
        .text(x, y + 62, "각성", {
          fontFamily: "sans-serif",
          fontSize: "12px",
          fontStyle: "bold",
          color: "#fef08a",
          backgroundColor: "#4a3112",
          padding: { x: 6, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(5);
    }
  }

  private fighterLabel(fighter: Fighter) {
    const awakened = this.awakenedFighterIds.has(fighter.id) ? fighter.awakened : undefined;
    return `${awakened?.title ?? fighter.title}  ${awakened?.name ?? fighter.name}`;
  }

  private fitImageInside(image: Phaser.GameObjects.Image, maxWidth: number, maxHeight: number) {
    const source = image.texture.getSourceImage() as { width?: number; height?: number };
    const sourceWidth = source.width ?? maxWidth;
    const sourceHeight = source.height ?? maxHeight;
    const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
    image.setDisplaySize(Math.round(sourceWidth * scale), Math.round(sourceHeight * scale));
  }

  private createFighters() {
    if (!this.replay) {
      return;
    }

    const leftFighter = FIGHTER_BY_ID[this.replay.left];
    const rightFighter = FIGHTER_BY_ID[this.replay.right];
    const fighterBaselineY = this.scale.height - 143;
    const leftView = createFighterView(
      this,
      leftFighter,
      this.scale.width * 0.28,
      fighterBaselineY,
      1,
      this.awakenedFighterIds.has(leftFighter.id),
    );
    const rightView = createFighterView(
      this,
      rightFighter,
      this.scale.width * 0.72,
      fighterBaselineY,
      -1,
      this.awakenedFighterIds.has(rightFighter.id),
    );

    this.views.set(leftFighter.id, leftView);
    this.views.set(rightFighter.id, rightView);
    this.hp.set(leftFighter.id, leftFighter.maxHp);
    this.hp.set(rightFighter.id, rightFighter.maxHp);
    leftView.container.setVisible(false);
    rightView.container.setVisible(false);
  }

  private async playOpeningFlow(flowToken: number) {
    const fighters = [...this.views.values()];
    if (!fighters.length || !this.isFlowActive(flowToken)) {
      return;
    }

    await Promise.all(fighters.map((view) => this.playEntrance(view)));
    if (!this.isFlowActive(flowToken)) {
      return;
    }

    fighters.forEach((view) => this.startIdle(view));
    await this.playCountdown();
    if (!this.isFlowActive(flowToken)) {
      return;
    }

    await this.fadeSlotReels(true);
    if (this.isFlowActive(flowToken)) {
      void this.playNextTurn();
    }
  }

  private async playEntrance(view: FighterView) {
    view.container.setVisible(true);
    view.container.setAlpha(1);
    view.slotGroup.setVisible(false).setAlpha(0);

    if (view.atlas?.metadata.animations.entrance?.frames.length) {
      await this.playAtlasSequence(view, "entrance", { returnToIdle: true });
      return;
    }

    const targetX = view.container.x;
    view.container.setX(targetX - view.facing * 86);
    view.container.setAlpha(0);
    await this.tweenPromise(view.container, {
      x: targetX,
      alpha: 1,
      duration: 520,
      ease: "Cubic.easeOut",
    });
    this.startIdle(view);
  }

  private async playCountdown() {
    for (const label of ["3", "2", "1", "開戰"]) {
      const isStartCall = label === "開戰";
      const text = this.add
        .text(this.scale.width / 2, this.scale.height * 0.42, label, {
          fontFamily: "serif",
          fontSize: isStartCall ? "72px" : "64px",
          fontStyle: "bold",
          color: isStartCall ? "#facc15" : "#fff7d6",
          stroke: "#5a0f0f",
          strokeThickness: isStartCall ? 8 : 6,
        })
        .setOrigin(0.5)
        .setDepth(80)
        .setAlpha(0)
        .setScale(0.72);

      await this.tweenPromise(text, {
        alpha: 1,
        scale: isStartCall ? 1.08 : 1,
        duration: 150,
        ease: "Back.easeOut",
      });
      await this.wait(isStartCall ? 560 : 390);
      await this.tweenPromise(text, {
        alpha: 0,
        scale: isStartCall ? 1.24 : 1.12,
        duration: isStartCall ? 220 : 160,
        ease: "Quad.easeIn",
      });
      text.destroy();
    }
  }

  private async fadeSlotReels(visible: boolean) {
    const tweens = [...this.views.values()].map((view) => {
      this.tweens.killTweensOf(view.slotGroup);
      if (visible) {
        view.slotGroup.setVisible(true);
        view.slotGroup.setAlpha(0);
        view.slotGroup.setScale(0.92);
        view.slotResultText.setText("");
      }

      return this.tweenPromise(view.slotGroup, {
        alpha: visible ? 1 : 0,
        scale: visible ? 1 : 0.94,
        duration: visible ? 360 : 220,
        ease: visible ? "Quad.easeOut" : "Quad.easeIn",
        onComplete: () => {
          if (!visible) {
            view.slotGroup.setVisible(false);
          }
        },
      });
    });

    await Promise.all(tweens);
  }

  private playNextTurn() {
    if (!this.replay || this.turnIndex >= this.replay.turns.length) {
      void this.finishBattle();
      return;
    }

    const entry = this.replay.turns[this.turnIndex];
    this.dispatch("battle-turn-start", entry);
    void this.playTurn(entry);
  }

  private async playTurn(entry: BattleLogEntry) {
    await this.spinSlots(entry);
    await this.resolveVisuals(entry);
    this.dispatch("battle-turn-resolved", entry);
    this.turnIndex += 1;
    await this.wait(340);
    void this.playNextTurn();
  }

  private spinSlots(entry: BattleLogEntry): Promise<void> {
    const attackerView = this.views.get(entry.attacker);
    const defenderView = this.views.get(entry.defender);
    if (!attackerView || !defenderView) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const attackCycle: AttackReelSymbol[] = ["WeakAttack", "StrongAttack", "Special"];
      const defenseCycle: DefenseReelSymbol[] = ["Block", "Dodge", "Counter", "RainbowReflect"];
      let ticks = 0;

      attackerView.slotFrame.setTexture("slot-frame-attack");
      defenderView.slotFrame.setTexture("slot-frame-defense");
      this.setSlotResult(attackerView, "공격 슬롯", "#fde68a", 0.72);
      this.setSlotResult(defenderView, "방어 슬롯", "#bfdbfe", 0.72);

      this.time.addEvent({
        delay: 76,
        repeat: 12,
        callback: () => {
          attackerView.reelIcons.forEach((icon, index) => {
            this.rollReelIcon(icon, ATTACK_ICON_KEYS[attackCycle[(ticks + index) % attackCycle.length]]);
          });
          defenderView.reelIcons.forEach((icon, index) => {
            this.rollReelIcon(icon, DEFENSE_ICON_KEYS[defenseCycle[(ticks + index) % defenseCycle.length]]);
          });
          ticks += 1;

          if (ticks >= 13) {
            attackerView.reelIcons.forEach((icon, index) => {
              this.stopReelIcon(
                icon,
                ATTACK_ICON_KEYS[entry.attackReels[index]],
                entry.attackAction === "AttackFail" ? 0xfca5a5 : 0xfde68a,
                index,
              );
            });
            defenderView.reelIcons.forEach((icon, index) => {
              this.stopReelIcon(
                icon,
                DEFENSE_ICON_KEYS[entry.defenseReels[index]],
                entry.defenseAction === "DefenseFail" ? 0xfca5a5 : 0xbfdbfe,
                index,
              );
            });
            this.setSlotResult(
              attackerView,
              `공격: ${ATTACK_LABELS[entry.attackAction]}`,
              entry.attackAction === "AttackFail" ? "#fca5a5" : "#fde68a",
              1,
            );
            this.setSlotResult(
              defenderView,
              `방어: ${DEFENSE_LABELS[entry.defenseAction]}`,
              entry.defenseAction === "DefenseFail" ? "#fca5a5" : "#bfdbfe",
              1,
            );
            this.time.delayedCall(360, resolve);
          }
        },
      });
    });
  }

  private setSlotResult(view: FighterView, text: string, color: string, alpha: number) {
    view.slotResultText.setText(text);
    view.slotResultText.setColor(color);
    view.slotResultText.setAlpha(alpha);
    view.slotResultText.setScale(0.95);
    this.tweens.killTweensOf(view.slotResultText);
    this.tweens.add({
      targets: view.slotResultText,
      scale: 1,
      alpha,
      duration: 120,
      ease: "Back.easeOut",
    });
  }

  private rollReelIcon(icon: Phaser.GameObjects.Image, textureKey: string) {
    const centerY = SLOT_REEL_CENTER_Y;
    icon.setTexture(textureKey);
    icon.clearTint();
    icon.setAlpha(0.15);
    icon.setY(centerY - 11);
    icon.setScale(SLOT_REEL_ICON_SCALE * 0.86);
    this.tweens.killTweensOf(icon);
    this.tweens.add({
      targets: icon,
      y: centerY + 6,
      alpha: 1,
      scale: SLOT_REEL_ICON_SCALE,
      duration: 70,
      ease: "Cubic.easeIn",
    });
  }

  private stopReelIcon(icon: Phaser.GameObjects.Image, textureKey: string, _tint: number, index: number) {
    const centerY = SLOT_REEL_CENTER_Y;
    this.time.delayedCall(index * 58, () => {
      this.tweens.killTweensOf(icon);
      icon.setTexture(textureKey);
      icon.clearTint();
      icon.setAlpha(1);
      icon.setY(centerY - 13);
      icon.setScale(SLOT_REEL_ICON_SCALE * 0.92);
      this.tweens.add({
        targets: icon,
        y: centerY,
        scale: SLOT_REEL_ICON_SCALE,
        duration: 160,
        ease: "Back.easeOut",
      });
    });
  }

  private async resolveVisuals(entry: BattleLogEntry) {
    const attackerView = this.views.get(entry.attacker);
    const defenderView = this.views.get(entry.defender);
    if (!attackerView || !defenderView) {
      return;
    }

    const direction = attackerView.container.x < defenderView.container.x ? 1 : -1;
    const moveDistance = entry.attackAction === "AttackFail" ? 8 : 42;
    const attackerStartX = attackerView.container.x;
    const attackMotion = motionForAttack(entry.attackAction);
    const defenseMotion = motionForDefense(entry.defenseAction);
    const motionPromises: Promise<void>[] = [];

    if (attackMotion) {
      motionPromises.push(this.playMotion(attackerView, attackMotion));
    }
    if (defenseMotion) {
      motionPromises.push(this.playMotion(defenderView, defenseMotion));
    }

    const lungePromise = this.tweenPromise(attackerView.container, {
      x: attackerStartX + moveDistance * direction,
      yoyo: true,
      duration: 130,
      ease: "Quad.easeOut",
    });

    await Promise.all([...motionPromises, lungePromise]);

    const hurtPromises: Promise<void>[] = [];
    if (entry.targetDamage > 0) {
      this.applyDamage(entry.defender, entry.targetDamage);
      this.showFloatingDamage(defenderView, `-${entry.targetDamage}`, "#fca5a5");
      hurtPromises.push(this.playMotion(defenderView, "hurt"));
      this.flash(defenderView, 0xffefef);
      this.cameras.main.shake(90, 0.004);
    }

    if (entry.reflectedDamage > 0) {
      this.applyDamage(entry.attacker, entry.reflectedDamage);
      this.showFloatingDamage(attackerView, `반사 -${entry.reflectedDamage}`, "#c084fc");
      hurtPromises.push(this.playMotion(attackerView, "hurt"));
      this.flash(attackerView, 0xc084fc);
      this.addBurst(attackerView.container.x, attackerView.container.y - 20, 0x67e8f9);
    } else if (entry.attackAction === "Special") {
      this.addBurst(defenderView.container.x, defenderView.container.y - 20, 0xfacc15);
    }

    if (entry.attackAction === "AttackFail" || entry.defenseAction === "DefenseFail") {
      this.cameras.main.shake(70, 0.0025);
    }

    await Promise.all(hurtPromises);
  }

  private playMotion(view: FighterView, motion: CharacterMotion, options: MotionPlaybackOptions = {}) {
    const returnToIdle = options.returnToIdle ?? true;
    view.animationTimer?.remove(false);
    view.animationToken += 1;
    const animationToken = view.animationToken;

    if (view.atlas) {
      return this.playAtlasMotion(view, motion, animationToken, { returnToIdle });
    }

    return new Promise<void>((resolve) => {
      let frameIndex = 0;
      const finish = () => {
        if (view.animationToken !== animationToken) {
          resolve();
          return;
        }

        if (returnToIdle) {
          this.startIdle(view);
        }
        resolve();
      };
      const applyFrame = () => {
        if (view.animationToken !== animationToken) {
          resolve();
          return;
        }

        view.sprite.setTexture(getAnimationFrameKey(view.fighterId, motion, frameIndex));
        view.sprite.setFlipX(view.facing === -1);
        frameIndex += 1;

        if (frameIndex < CHARACTER_FRAME_COUNT) {
          view.animationTimer = this.time.delayedCall(84, applyFrame);
          return;
        }

        view.animationTimer = this.time.delayedCall(90, () => {
          if (view.animationToken === animationToken && returnToIdle) {
            view.sprite.setTexture(getAnimationFrameKey(view.fighterId, "weakAttack", 0));
            view.sprite.setFlipX(view.facing === -1);
          }
          finish();
        });
      };

      applyFrame();
    });
  }

  private playAtlasMotion(
    view: FighterView,
    motion: CharacterMotion,
    animationToken: number,
    options: MotionPlaybackOptions = {},
  ) {
    if (!view.atlas) {
      return Promise.resolve();
    }

    const animationName = getAtlasAnimationName(motion);
    return this.playAtlasAnimation(view, animationName, animationToken, options);
  }

  private playAtlasSequence(view: FighterView, animationName: string, options: MotionPlaybackOptions = {}) {
    view.animationTimer?.remove(false);
    view.animationToken += 1;
    return this.playAtlasAnimation(view, animationName, view.animationToken, options);
  }

  private playAtlasAnimation(
    view: FighterView,
    animationName: string,
    animationToken: number,
    options: MotionPlaybackOptions = {},
  ) {
    if (!view.atlas) {
      return Promise.resolve();
    }

    const animation = view.atlas.metadata.animations[animationName];
    if (!animation?.frames.length) {
      if (options.returnToIdle ?? true) {
        this.startIdle(view);
      }
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      let frameIndex = 0;
      let resolved = false;
      const finish = () => {
        if (resolved) {
          return;
        }

        resolved = true;
        if (view.animationToken === animationToken && (options.returnToIdle ?? true)) {
          this.startIdle(view);
        }
        resolve();
      };
      const playNextFrame = () => {
        if (view.animationToken !== animationToken) {
          finish();
          return;
        }

        const delay = this.applyAtlasFrame(view, animationName, frameIndex);
        frameIndex += 1;
        if (frameIndex < animation.frames.length) {
          view.animationTimer = this.time.delayedCall(delay, playNextFrame);
          return;
        }

        view.animationTimer = this.time.delayedCall(Math.max(delay, 90), finish);
      };

      playNextFrame();
    });
  }

  private applyAtlasFrame(view: FighterView, animationName: string, frameIndex: number) {
    if (!view.atlas) {
      return 84;
    }

    const frameData = getAtlasFrameMetadata(view.atlas, animationName, frameIndex);
    if (!frameData) {
      return 84;
    }

    const { definition } = view.atlas;
    const { frameName, frame } = frameData;
    view.sprite.setTexture(definition.textureKey, getSpriteAtlasFrameKey(definition, frameName));
    view.sprite.setOrigin(frame.pivotX / frame.w, frame.pivotY / frame.h);
    view.sprite.setPosition(view.facing === -1 ? frame.offsetX : -frame.offsetX, 68 - frame.offsetY);
    view.sprite.setScale(1);
    view.sprite.setFlipX(view.facing === -1);
    return frame.duration || 84;
  }

  private startIdle(view: FighterView) {
    view.animationTimer?.remove(false);
    view.animationToken += 1;
    const animationToken = view.animationToken;

    if (!view.atlas?.metadata.animations.idle?.frames.length) {
      view.sprite.setTexture(getAnimationFrameKey(view.fighterId, "weakAttack", 0));
      view.sprite.setFlipX(view.facing === -1);
      return;
    }

    const frameTotal = view.atlas.metadata.animations.idle.frames.length;
    let frameIndex = 0;
    const playNextFrame = () => {
      if (view.animationToken !== animationToken) {
        return;
      }

      const delay = this.applyAtlasFrame(view, "idle", frameIndex);
      frameIndex = (frameIndex + 1) % frameTotal;
      view.animationTimer = this.time.delayedCall(delay, playNextFrame);
    };

    playNextFrame();
  }

  private showFloatingDamage(view: FighterView, text: string, color: string) {
    const label = this.add
      .text(view.container.x + view.facing * 28, view.container.y - 92, text, {
        fontFamily: "serif",
        fontSize: "30px",
        color,
        stroke: "#000000",
        strokeThickness: 6,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(40);

    label.setAlpha(0);
    label.setScale(0.92);
    this.tweens.add({
      targets: label,
      y: label.y - 48,
      alpha: 1,
      scale: 1.08,
      duration: 160,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: label,
          y: label.y - 28,
          alpha: 0,
          delay: 360,
          duration: 260,
          ease: "Quad.easeIn",
          onComplete: () => label.destroy(),
        });
      },
    });
  }

  private applyDamage(target: CharacterId, damage: number) {
    const current = this.hp.get(target) ?? 0;
    const next = Math.max(0, current - damage);
    this.hp.set(target, next);
    this.updateHudHp(target, next);
  }

  private updateHudHp(target: CharacterId, hp: number) {
    if (!this.replay || !this.hud) {
      return;
    }

    const fighter = FIGHTER_BY_ID[target];
    const ratio = Phaser.Math.Clamp(hp / fighter.maxHp, 0, 1);
    const color = ratio < 0.3 ? 0xef4444 : ratio < 0.6 ? 0xf59e0b : 0x16a34a;

    if (target === this.replay.left) {
      this.hud.leftBar.width = 322 * ratio;
      this.hud.leftBar.fillColor = color;
      this.hud.leftHpText.setText(`${hp} / ${fighter.maxHp}`);
    } else {
      this.hud.rightBar.width = 322 * ratio;
      this.hud.rightBar.fillColor = color;
      this.hud.rightHpText.setText(`${hp} / ${fighter.maxHp}`);
    }
  }

  private flash(view: FighterView, color: number) {
    view.sprite.setTint(color);
    this.tweens.add({
      targets: view.sprite,
      alpha: 0.55,
      yoyo: true,
      duration: 90,
      repeat: 1,
      onComplete: () => {
        view.sprite.clearTint();
        view.sprite.setAlpha(1);
      },
    });
  }

  private addBurst(x: number, y: number, color: number) {
    const ring = this.add.circle(x, y, 8, color, 0.45).setStrokeStyle(3, color);
    this.tweens.add({
      targets: ring,
      scale: 4,
      alpha: 0,
      duration: 360,
      onComplete: () => ring.destroy(),
    });
  }

  private async finishBattle() {
    if (!this.replay || this.finishStarted) {
      return;
    }

    this.finishStarted = true;
    this.battleFlowToken += 1;
    const winnerView = this.views.get(this.replay.winner);
    const loserId = this.replay.left === this.replay.winner ? this.replay.right : this.replay.left;
    const loserView = this.views.get(loserId);
    await this.fadeSlotReels(false);

    if (loserView) {
      await this.playDeath(loserView);
    }

    if (winnerView) {
      this.startIdle(winnerView);
      this.tweens.add({
        targets: winnerView.container,
        y: winnerView.container.y - 18,
        yoyo: true,
        repeat: 3,
        duration: 160,
      });
    }

    const winner = FIGHTER_BY_ID[this.replay.winner];
    const banner = this.add.container(this.scale.width / 2, this.scale.height * 0.42).setDepth(90);
    const plate = this.add.rectangle(0, 0, 520, 104, 0x090909, 0.72).setStrokeStyle(3, 0xfacc15);
    const label = this.add
      .text(0, -8, `勝者 ${this.fighterLabel(winner)}`, {
        fontFamily: "serif",
        fontSize: "34px",
        fontStyle: "bold",
        color: "#fef3c7",
        stroke: "#5a0f0f",
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    banner.add([plate, label]);
    banner.setAlpha(0).setScale(0.92);
    await this.tweenPromise(banner, {
      alpha: 1,
      scale: 1,
      duration: 260,
      ease: "Back.easeOut",
    });
    await this.wait(3000);
    this.dispatch("battle-complete", this.replay);
  }

  private async playDeath(view: FighterView) {
    view.animationTimer?.remove(false);

    if (view.atlas?.metadata.animations.death?.frames.length) {
      await this.playAtlasSequence(view, "death", { returnToIdle: false });
      return;
    }

    await this.tweenPromise(view.container, {
      alpha: 0.35,
      y: view.container.y + 24,
      angle: view.facing * -8,
      duration: 620,
      ease: "Cubic.easeIn",
    });
  }

  private roundLabel(round: BattleReplay["round"]) {
    if (round === "RoundOf16") {
      return "16강";
    }
    if (round === "Quarterfinal") {
      return "1회전";
    }
    if (round === "Semifinal") {
      return "준결승";
    }
    return "결승";
  }

  private dispatch(name: string, detail: unknown) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  private isFlowActive(flowToken: number) {
    return this.battleFlowToken === flowToken && !this.finishStarted;
  }

  private wait(duration: number) {
    return new Promise<void>((resolve) => {
      this.time.delayedCall(duration, resolve);
    });
  }

  private tweenPromise(
    target: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[],
    config: Omit<Phaser.Types.Tweens.TweenBuilderConfig, "targets">,
  ) {
    return new Promise<void>((resolve) => {
      this.tweens.add({
        ...config,
        targets: target,
        onComplete: (...args) => {
          if (typeof config.onComplete === "function") {
            config.onComplete(...args);
          }
          resolve();
        },
      });
    });
  }
}
