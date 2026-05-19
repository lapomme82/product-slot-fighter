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
