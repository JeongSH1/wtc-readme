#!/usr/bin/env node
// analyze-readmes.js
// 특정 GitHub 저장소의 PR들에서
// 각 head repo의 README를 읽어 단어 등장 횟수 분석 (병렬 처리 + 토큰 입력 + 예쁜 터미널 출력)

const axios = require("axios");
const chalk = require("chalk");

// 기본값 (인자 없을 때)
const DEFAULT_OWNER = "woowacourse-precourse";
const DEFAULT_REPO = "java-lotto-8";

// ===== 유틸: 간단한 CLI 인자 파싱 =====
function parseArgs() {
  const args = process.argv.slice(2);

  const owner = DEFAULT_OWNER;
  let repo = DEFAULT_REPO;

  if (args[0]) {
    repo = args[0];
  }

  return { owner, repo };
}

// ===== GitHub API 클라이언트 생성 =====
function createGithubClient(token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return axios.create({
    baseURL: "https://api.github.com",
    headers,
  });
}

// ===== PR 전체 가져오기 (페이지네이션) =====
async function fetchAllPRs(api, owner, repo) {
  const prs = [];
  let page = 1;

  while (true) {
    const res = await api.get(`/repos/${owner}/${repo}/pulls`, {
      params: {
        state: "all", // open/closed/all
        per_page: 100,
        page,
      },
    });

    if (res.data.length === 0) break;

    prs.push(...res.data);
    page += 1;
  }

  return prs;
}

// ===== 각 리포의 README 가져오기 =====
async function fetchReadme(api, fullName) {
  try {
    const res = await api.get(`/repos/${fullName}/readme`);
    const data = res.data;

    if (!data.content) return null;

    const encoding = data.encoding || "base64";
    if (encoding !== "base64") {
      console.warn(
        chalk.yellow(
          `⚠ 예상치 못한 인코딩(${encoding}) - ${fullName} README 건너뜀`
        )
      );
      return null;
    }

    const buf = Buffer.from(data.content, "base64");
    return buf.toString("utf8");
  } catch (err) {
    if (err.response && err.response.status === 404) {
      console.warn(chalk.gray(`∙ README 없음: ${fullName}`));
      return null;
    }
    console.warn(
      chalk.red(
        `⚠ README 가져오기 실패: ${fullName} (${err.message || "unknown error"})`
      )
    );
    return null;
  }
}

// ===== 단어 토크나이즈 & 카운트 =====
function updateWordCounts(text, map) {
  const lower = text.toLowerCase();

  // 글자/숫자/언더스코어만 단어로 보고 나머지는 구분자로 사용
  const tokens = lower.split(/[^0-9_\p{L}]+/u).filter(Boolean);

  for (const word of tokens) {
    if (word.length <= 1) continue; // 한 글자 짜리 제거 (원하면 조정)

    const prev = map.get(word) || 0;
    map.set(word, prev + 1);
  }
}

// ===== 리스트를 batch 단위로 병렬 실행 =====
async function processInBatches(items, batchSize, worker) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const idxInfo = `(${i + 1}~${Math.min(i + batch.length, items.length)}/${
      items.length
    })`;

    console.log(
      chalk.blueBright(`\n▶ 배치 처리 시작 ${idxInfo} (동시 ${batchSize}개)`),
    );

    const batchResults = await Promise.all(
      batch.map(async (item) => {
        try {
          return await worker(item);
        } catch (e) {
          console.warn(
            chalk.red(
              `  ⚠ batch worker 에서 오류: ${e.message || String(e)}`
            )
          );
          return null;
        }
      })
    );

    results.push(...batchResults);
  }

  return results;
}

// ===== 메인 로직 =====
async function main() {
  const { owner, repo } = parseArgs();

  const token = process.env.GITHUB_TOKEN || "";

  if (!token) {
    console.log("");
    console.log(chalk.red.bold("🚫 GitHub API Token이 필요합니다!"));
    console.log("");
    console.log(chalk.whiteBright("이 도구는 GitHub API 요청을 많이 사용하여"));
    console.log(chalk.whiteBright("비로그인 모드로는 정상 작동할 수 없습니다."));
    console.log("");
    console.log(chalk.cyan("🔑 토큰 생성 방법:"));
    console.log(chalk.yellow("1. 아래 주소로 이동하여 Personal Access Token 생성\n   "));
    console.log(
      chalk.green("   https://github.com/settings/tokens?type=beta")
    );
    console.log("");
    console.log(chalk.cyan("2. 토큰을 환경 변수로 설정 (macOS / Linux):"));
    console.log(chalk.yellow("   export GITHUB_TOKEN=\"발급받은_토큰\""));
    console.log("");
    console.log(chalk.cyan("3. Windows PowerShell:"));
    console.log(chalk.yellow("   setx GITHUB_TOKEN \"발급받은_토큰\""));
    console.log("");
    console.log(chalk.white("다시 실행하세요:"));
    console.log(chalk.green("   npx wtc-readme <repo>"));
    console.log("");

    process.exit(1);
  }

  console.log(
    chalk.cyan.bold("\n📖 GitHub README Word Analyzer") +
      chalk.gray("  –  by JeongSH1\n")
  );

  console.log(
    chalk.whiteBright("📦 대상 저장소: ") +
      chalk.green.bold(`${owner}/${repo}`)
  );

  if (token) {
    console.log(
      chalk.whiteBright("🔐 인증 모드: ") +
        chalk.green("토큰 사용 (higher rate-limit)")
    );
  } else {
    console.log(
      chalk.whiteBright("🔓 인증 모드: ") +
        chalk.yellow("비로그인 (rate-limit 60 req/hour)")
    );
    console.log(
      chalk.gray(
        "    → 필요하면 GITHUB_TOKEN 환경변수를 설정해서 더 안정적으로 사용할 수 있어요."
      )
    );
  }

  const api = createGithubClient(token);

  console.log(chalk.blueBright("\n⏳ PR 목록 불러오는 중..."));

  const prs = await fetchAllPRs(api, owner, repo);
  console.log(
    chalk.green(`✅ PR 불러오기 완료: `) +
      chalk.whiteBright(`${prs.length}개`)
  );

  // head.repo.full_name 모으기 (중복 제거)
  const repoSet = new Set();

  for (const pr of prs) {
    const headRepo = pr.head && pr.head.repo;
    if (!headRepo) continue;
    if (headRepo.full_name) {
      repoSet.add(headRepo.full_name);
    }
  }

  const repoList = Array.from(repoSet);
  console.log(
    chalk.whiteBright("\n🧾 고유 head repo 수: ") +
      chalk.magentaBright(`${repoList.length}개`)
  );

  const wordCounts = new Map();
  const CONCURRENCY = 20;

  console.log(
    chalk.blueBright(
      `\n🚀 README 병렬 수집 시작 (동시 ${CONCURRENCY}개, ${
        token ? "토큰 사용" : "비로그인"
      })\n`
    )
  );

  await processInBatches(repoList, CONCURRENCY, async (fullName) => {
    console.log(chalk.gray(`  • ${fullName} 의 README 요청 중...`));
    const readme = await fetchReadme(api, fullName);
    if (!readme) return null;

    updateWordCounts(readme, wordCounts);
    return null;
  });

  console.log(chalk.green("\n✨ 단어 빈도 계산 완료.\n"));

  // Map -> 배열로 변환 후, 등장 빈도 순으로 정렬
  const sorted = Array.from(wordCounts.entries()).sort((a, b) => b[1] - a[1]);

  const TOP_N = 50;
  console.log(
    chalk.bold(`🏆 상위 ${TOP_N} 단어`) +
      chalk.gray(`  (총 서로 다른 단어 수: ${sorted.length})\n`)
  );

  // 간단한 테이블 출력
  const top = sorted.slice(0, TOP_N);
  const maxWordLen = Math.min(
    30,
    top.reduce((max, [w]) => Math.max(max, w.length), 4)
  );

  const header =
    chalk.gray("#".padEnd(4)) +
    chalk.whiteBright("word".padEnd(maxWordLen + 2)) +
    chalk.whiteBright("count");
  console.log(header);
  console.log(chalk.gray("-".repeat(4 + maxWordLen + 2 + 10)));

  top.forEach(([word, count], idx) => {
    const rankStr = String(idx + 1).padStart(2, " ");
    const wordStr =
      word.length > maxWordLen
        ? word.slice(0, maxWordLen - 1) + "…"
        : word;
    const coloredWord =
      idx < 3
        ? chalk.yellowBright(wordStr)
        : chalk.white(wordStr);

    console.log(
      chalk.gray(`${rankStr}. `) +
        coloredWord.padEnd(maxWordLen + 2) +
        chalk.cyan(String(count))
    );
  });

  console.log("\n" + chalk.gray("완료 ✅"));
}

main().catch((err) => {
  console.error(chalk.red("\n💥 실행 중 오류 발생:"), err);
  process.exit(1);
});