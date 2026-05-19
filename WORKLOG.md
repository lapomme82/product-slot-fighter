# 작업 히스토리

서로 다른 로컬 PC에서 같은 프로젝트를 이어 작업하기 위한 작업 기록입니다.  
자세한 변경 이력은 Git 커밋 히스토리를 기준으로 보고, 이 파일에는 동기화 상태와 다음 작업자가 바로 확인해야 할 맥락을 남깁니다.

## 2026-05-19 현재 PC 동기화

- GitHub 저장소 `lapomme82/product-slot-fighter`를 현재 PC의 작업 폴더에 클론했습니다.
- 원격 저장소는 `origin https://github.com/lapomme82/product-slot-fighter.git`로 연결되어 있습니다.
- 현재 브랜치는 `main`이며 `origin/main`과 같은 위치입니다.
- 최신 확인 커밋은 `de9c8b3 Add awakened character reveal roster`입니다.
- `npm ci`로 의존성을 설치했습니다.
- `npm test` 결과: 4개 테스트 파일, 19개 테스트 통과.
- `npm run build` 결과: 프로덕션 빌드 성공.
- 개발 서버 실행 확인 주소: `http://127.0.0.1:5175/`

## 2026-05-19 캐릭터 각성 전환 수정

- 일반 캐릭터와 각성 캐릭터 토글 전환을 카드 플립 애니메이션으로 변경했습니다.
- 선택 리스트 카드에도 플립 애니메이션을 함께 적용했습니다.
- 각성 상태 표시 배지를 `data-awakened-badge`로 분리해 일반 캐릭터로 되돌릴 때 확실히 제거되도록 수정했습니다.
- 엔트리 배지도 `data-entry-badge`로 분리해 각성 배지와 서로 간섭하지 않게 했습니다.
- 검증: `npm test` 통과, `npm run build` 통과.

## 2026-05-19 타이틀 배경 적용

- 첨부 이미지를 `public/assets/stages/title-office-battle.png`로 추가했습니다.
- 타이틀 화면에서 `assetUrl()`로 배경 이미지 URL을 계산해 배포 경로에서도 동작하도록 연결했습니다.
- 배경 위 타이틀 문구가 읽히도록 어두운 오버레이와 텍스트 그림자를 적용했습니다.
- 검증: `npm test` 통과, `npm run build` 통과.

## 2026-05-19 타이틀 배경 렌더링 보강

- GitHub Pages에서 배경이 보이지 않는 상황을 줄이기 위해 CSS 변수 배경 대신 실제 `.title-background` DOM 레이어를 추가했습니다.
- 오버레이는 `.title-screen::after`로 분리해 이미지 레이어가 명확히 렌더링되도록 수정했습니다.
- 검증: `npm test` 통과, `npm run build` 통과.

## 2026-05-19 타이틀 로고 적용

- 첨부 로고 이미지를 타이틀 화면용 `public/assets/ui/title-logo.png`로 추가했습니다.
- 타이틀 화면의 텍스트 제목을 시각적으로는 로고 이미지로 대체하고, 접근성용 제목은 `sr-only`로 유지했습니다.
- 배경 위에서 로고가 선명하게 보이도록 크기, 위치, 드롭 섀도, 모바일 크기 제한을 적용했습니다.
- 검증: `npm test` 통과, `npm run build` 통과, 개발 서버에서 로고 이미지 `200 OK` 확인.

## 최근 Git 히스토리

- `de9c8b3` Add awakened character reveal roster
- `104555b` Add awakened fighter selection
- `6023349` Add character select transition
- `3894712` Fix character select reveal flicker
- `83c4982` Initial GitHub Pages deploy

## 로컬 간 작업 규칙

작업 시작 전:

```bash
git pull --ff-only
npm ci
```

작업 종료 전:

```bash
npm test
npm run build
git status
```

변경 사항이 있으면 의미 단위로 커밋한 뒤 GitHub에 푸시합니다.

```bash
git add <changed-files>
git commit -m "Describe the completed work"
git push
```

다른 로컬에서 이어 작업할 때는 먼저 `git pull --ff-only`로 최신 커밋을 받은 뒤 시작합니다.
