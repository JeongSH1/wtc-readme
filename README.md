# wtc-readme

본 프로젝트는 **우아한테크코스 프리코스 저장소의 PR 참여자들의 README를 자동으로 수집하고**,  
README 텍스트를 기반으로 **단어 등장 빈도를 분석하는 CLI 도구**입니다.

---

## 🧪 낯선 도구 해커톤 – 수행 내용

이번 낯선 도구 해커톤에서는 평소 사용하지 않던 **Node.js 기반의 CLI 도구 개발**을 도전해 보았습니다.  
결과물을 완성하기까지 다음과 같은 기술적 요소를 학습하고 활용했습니다.

- **npm 패키지 제작 및 배포 과정 학습**
- **npx로 설치 없이 즉시 실행 가능한 CLI 제공**
- **GitHub API 호출 방식 학습 (REST · 인증 유무 차이)**
- **여러 쓰레드(병렬 요청)로 README 요청 속도 최적화**
- **chalk 등으로 컬러풀한 터미널 UI 구성**

이 과정을 통해 사용자가 명령어 한 줄로 실행할 수 있는 실용적인 CLI 유틸리티를 완성했습니다.

---

## ▶ 실행 방법

`wtc-readme` 패키지는 **설치 없이 바로 실행**하도록 npx 기반으로 설계되었습니다.  
아래 명령어만 입력하면 즉시 실행됩니다.

```bash
npx wtc-readme
```

### 🔐 GitHub API 토큰 설정하기 (필수)

비로그인 상태는 GitHub API 제한(60 req/hour)이 있어
특히 PR·README가 많은 저장소 분석 시 오류가 발생할 수 있습니다.

개인 토큰을 환경변수로 설정해야 합니다.
(※ 공개 API만 사용하므로 repo 권한 불필요)

1. GitHub Personal Access Token 생성

GitHub → Settings → Developer Settings → Personal access tokens → Fine-grained tokens

2. 터미널에서 환경 변수 설정
```bash
macOS / Linux
export GITHUB_TOKEN="your_token_here"

window
setx GITHUB_TOKEN "your_token_here"
```

### 📁 다른 프리코스 저장소 분석하기
저장소 이름만 인자로 넘기면 됩니다.
```
npx wtc-readme java-racingcar-8
```

### 📝 예시 출력
```
📖 GitHub README Word Analyzer – by 우러이
📦 대상 저장소: woowacourse-precourse/java-lotto-8
⏳ PR 목록 불러오는 중...
🧾 고유 head repo 수: 39개
🚀 README 병렬 수집 시작 (동시 20개)

🏆 상위 50 단어
#   word                 count
1.  lotto                89
2.  java                 74
3.  result               62
...
```