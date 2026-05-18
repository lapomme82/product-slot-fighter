# GitHub Pages 배포

이 프로젝트는 GitHub Pages에서 정적 웹앱으로 배포할 수 있습니다.

## 최초 1회 설정

1. GitHub에서 새 저장소를 만듭니다.
   - 예: `wuxia-slot-fighter`
   - 공개 접속을 원하면 Public 저장소가 가장 단순합니다.

2. 이 폴더에서 저장소를 연결하고 push합니다.

```bash
git init
git add .
git commit -m "Initial GitHub Pages deploy"
git branch -M main
git remote add origin https://github.com/<github-id>/<repo-name>.git
git push -u origin main
```

3. GitHub 저장소에서 `Settings > Pages`로 이동합니다.

4. `Build and deployment`의 Source를 `GitHub Actions`로 설정합니다.

5. `Actions` 탭에서 `Deploy GitHub Pages` 워크플로우가 끝나면 배포 URL이 생성됩니다.

## 이후 업데이트

코드를 수정한 뒤 아래 명령으로 올리면 자동으로 다시 배포됩니다.

```bash
git add .
git commit -m "Update game"
git push
```

## 로컬 확인

```bash
npm install
npm test
npm run build
npm run preview
```
