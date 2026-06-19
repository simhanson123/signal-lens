# **MCP 기반 AI PR 리뷰 및 메인테이너 자동화 에이전트 개발 전략 보고서**

## **1. 서론: AI 생성 코드 시대의 핵심 병목은 '작성'이 아니라 '검증'이다**

소프트웨어 개발은 코드 자동 완성의 단계를 넘어, 여러 개의 AI 코딩 에이전트가 기능 구현, 버그 수정, 리팩터링, 문서화, 릴리스 준비까지 병렬로 수행하는 방향으로 빠르게 이동하고 있다. 이 변화는 개발 생산성을 크게 높였지만, 동시에 오픈소스 메인테이너에게 새로운 부담을 만들었다. 이제 병목은 코드를 작성하는 속도가 아니라, **AI가 만들어낸 Pull Request가 실제 프로젝트의 의도, 아키텍처, 보안 경계, 릴리스 정책에 부합하는지 검증하는 작업**으로 이동하고 있다.

여러 가능한 AI 코딩 인프라 프로젝트 중에서, 단기간에 OpenAI 오픈소스 지원 프로그램의 취지와 가장 직접적으로 맞고, 실제 사용자에게 명확한 가치를 전달하며, 1인 또는 소규모 팀이 MVP를 만들기 쉬운 방향은 하나다.

최종적으로 선택해야 할 프로젝트는 **"MCP(Model Context Protocol)를 활용한 AI 기반 PR(Pull Request) 리뷰 및 메인테이너 자동화 에이전트"**이다. 이 프로젝트는 PR 리뷰 파이프라인을 중심축으로 삼고, MCP 기반 레포지토리 컨텍스트와 영구 피드백 메모리를 핵심 차별화 기능으로 포함한다. 테스트 생성과 런타임 증거 수집은 초기 독립 목표로 삼지 않고, 향후 고도화 단계에서 "런타임 증거 기반 리뷰" 확장 모듈로 남긴다.

이 프로젝트의 중심은 PR 리뷰와 메인테이너 자동화다. MCP 기반 레포지토리 컨텍스트, 영구 피드백 메모리, 릴리스 워크플로우 자동화는 모두 이 중심 목표를 강화하는 내부 기능으로 배치한다. 런타임 트래픽 기반 테스트 생성처럼 구현 난도가 높은 기능은 초기 제품 범위에서 제외하고, 향후 "런타임 증거 기반 리뷰" 확장 모듈로 남긴다.

따라서 본 보고서는 하나의 명확한 오픈소스 제품 전략을 제시한다. 목표는 단순한 AI 리뷰 봇을 만드는 것이 아니라, **레포지토리 맥락을 MCP로 구조화하고, PR 변경사항을 증거 기반으로 분석하며, 메인테이너의 반복 업무를 자동화하는 차세대 OSS 유지보수 인프라**를 설계하는 것이다.

## **2. 최종 선정 프로젝트: MCP 기반 AI PR 리뷰 및 메인테이너 자동화 에이전트**

### **2.1 프로젝트 한 줄 정의**

이 프로젝트는 GitHub Pull Request가 열릴 때마다 단순히 diff만 읽고 코멘트를 남기는 봇이 아니라, MCP 서버를 통해 레포지토리의 코드 구조, 기존 규칙, 과거 리뷰 피드백, 보안 정책, 릴리스 맥락을 읽어와서 **메인테이너 수준의 문맥 기반 리뷰와 자동화 작업을 수행하는 오픈소스 에이전트**다.

### **2.2 권장 프로젝트명**

실제 저장소명은 짧고 기억하기 쉬워야 한다. 다음 중 하나를 추천한다.

| 후보명 | 장점 | 비고 |
| :--- | :--- | :--- |
| **signal-lens** | 가장 직관적이고 검색 친화적 | 추천 |
| **maintainer-mcp** | PR 리뷰를 넘어 메인테이너 자동화까지 포괄 | 장기 비전에 적합 |
| **pr-context-agent** | "문맥 기반 PR 리뷰"라는 차별점이 명확 | 설명적이지만 다소 길다 |

초기에는 `signal-lens`가 가장 좋다. slug로는 유지하되, **v2.0.0부터 대외 포지셔닝은 "메인테이너 PR 리뷰 플랫폼"**으로 정리한다. MCP는 선택적 통합 레이어이며, Agent Skill·CLI·Action이 주 진입점이다.

### **2.3 왜 이 프로젝트가 최적의 선택인가**

이 프로젝트를 강력히 추천하는 이유는 세 가지다.

첫째, OpenAI의 Codex for Open Source 프로그램과 정합성이 가장 높다. OpenAI 공식 페이지는 오픈소스 메인테이너가 API 크레딧, 6개월 ChatGPT Pro with Codex, Codex Security 접근을 신청할 수 있다고 설명하며, 특히 API 크레딧의 활용 예로 **pull request review, maintainer automation, release workflows**를 명시한다.[1] 이 프로젝트는 바로 그 세 가지 항목을 제품의 핵심 기능으로 삼는다.

둘째, MCP라는 최신 표준을 제품의 중심에 둘 수 있다. MCP는 AI 애플리케이션이 외부 시스템과 컨텍스트를 교환하는 프로토콜이며, MCP 서버는 Tools, Resources, Prompts를 통해 AI 애플리케이션에 기능과 맥락을 제공한다.[4][5] PR 리뷰 도구가 MCP 서버를 제공하면 Codex, Cursor, Claude Code, 기타 MCP 호스트가 동일한 레포지토리 컨텍스트를 재사용할 수 있다.

셋째, 시장의 실제 고통 지점이 분명하다. GitHub는 에이전트가 생성한 PR이 늘어나면서 리뷰어가 봐야 할 핵심 위험으로 CI 약화, 중복 유틸리티, 겉보기에는 맞지만 실제로는 틀린 로직, 워크플로우 내 untrusted input 문제를 지적했다.[7] 이 프로젝트는 바로 그 문제들을 자동으로 선별하고, 메인테이너가 판단해야 할 부분만 고신뢰 신호로 압축해주는 도구가 된다.

## **3. 제품 범위 확정 원칙**

초기 제품은 "PR 리뷰 품질"과 "메인테이너 업무 감소"에 집중해야 한다. 범위가 넓어질수록 MVP 출시가 늦어지고, OpenAI 지원 신청에서 전달해야 할 핵심 메시지도 흐려진다. 따라서 기능은 다음 기준으로 나눈다.

| 범위 | 포함 여부 | 이유 |
| :--- | :--- | :--- |
| PR diff 분석, CI 약화 탐지, 보안 경계 점검 | **초기 MVP 포함** | 사용자가 즉시 체감하는 핵심 가치다. |
| MCP 기반 레포지토리 컨텍스트 | **핵심 차별화 기능으로 포함** | diff-only 리뷰와 구분되는 가장 중요한 기술적 근거다. |
| 과거 리뷰 피드백과 false positive 메모리 | **v0.2 포함** | 프로젝트별 리뷰 품질을 지속적으로 높인다. |
| 릴리스 노트, 이슈 트리아지, changelog 자동화 | **v0.3 포함** | OpenAI 프로그램의 maintainer automation 및 release workflow와 연결된다. |
| 런타임 트래픽 기반 테스트 생성 | **장기 확장으로 보류** | 초기 제품 난도를 과도하게 높이므로 PR 리뷰 엔진이 안정화된 뒤 추가한다. |

즉, 프로젝트의 첫 번째 공개 버전은 "설치 즉시 PR 리뷰 품질을 높이는 도구"여야 한다. 지식 그래프, 장기 메모리, 릴리스 자동화는 모두 이 목표를 강화할 때만 포함한다.

## **4. OpenAI Codex for Open Source 프로그램과의 전략적 정합성**

OpenAI의 Codex for Open Source 프로그램은 중요한 오픈소스 소프트웨어를 유지보수하는 메인테이너를 지원하기 위한 프로그램이다. 공식 설명에 따르면 지원 항목은 API 크레딧, 6개월 ChatGPT Pro with Codex, 조건부 Codex Security 접근으로 구성된다.[1] 프로그램 약관은 지원 여부가 OpenAI의 판단에 따르며, 레포지토리 사용량, 생태계 중요도, 활발한 유지보수 증거, 신청자의 역할 또는 권한, 프로그램 수용 여력 등이 고려될 수 있다고 명시한다.[2]

이 기준을 역으로 해석하면, 새 오픈소스 프로젝트는 단순히 "AI를 사용한다"는 수준이 아니라 다음을 보여줘야 한다.

1. 오픈소스 유지보수자의 실제 업무를 줄인다.
2. PR 리뷰, 이슈 트리아지, 릴리스 준비 같은 반복 업무를 자동화한다.
3. AI 사용이 프로젝트의 부가 기능이 아니라 핵심 실행 경로에 있다.
4. API 크레딧이 필요한 이유가 명확하고, 사용량이 제품 가치와 직접 연결된다.
5. 특정 IDE나 단일 벤더에만 묶이지 않고, 여러 개발 환경에서 재사용될 수 있다.

`signal-lens`는 이 조건을 정면으로 만족한다.

| OpenAI 지원 항목 | 프로젝트에서의 활용 계획 |
| :--- | :--- |
| ChatGPT Pro with Codex | 프로젝트 자체 개발, 코드 리뷰 정책 설계, 릴리스 노트 작성, 이슈 트리아지 자동화에 활용 |
| API 크레딧 | PR diff 분석, 레포지토리 컨텍스트 요약, 다중 에이전트 리뷰, 보안 경계 점검, 리뷰 코멘트 생성에 사용 |
| Codex Security | 에이전트가 읽고 처리하는 코드, GitHub Action, MCP 서버 권한 모델의 보안성 검증에 활용 |

OpenAI 신청서에서는 이 프로젝트를 "새로운 AI 앱"이 아니라 **오픈소스 메인테이너의 리뷰 병목을 줄이는 인프라 도구**로 포지셔닝해야 한다. 특히 API 크레딧 사용 계획에는 PR 리뷰, 메인테이너 자동화, 릴리스 워크플로우가 모두 들어가야 한다.

## **5. 시장 문제: AI PR은 늘어나지만 리뷰 컨텍스트는 부족하다**

AI 코딩 에이전트가 만든 PR은 대체로 깔끔해 보인다. 코드 스타일이 일관되고, 기본 테스트를 통과하며, PR 설명도 그럴듯하다. 문제는 바로 그 지점에 있다. 겉보기 품질이 높아질수록 리뷰어는 더 쉽게 승인하지만, 실제 위험은 더 깊은 곳에 숨어 있을 수 있다.

대표적인 위험은 다음과 같다.

| 위험 유형 | 설명 | 자동화 리뷰가 잡아야 할 신호 |
| :--- | :--- | :--- |
| CI 약화 | 테스트 실패를 우회하기 위해 워크플로우, coverage, lint 조건을 완화 | `.github/workflows`, test config, coverage threshold 변경 |
| 코드 재사용 실패 | 기존 유틸리티를 찾지 못하고 유사 함수를 새로 작성 | 신규 helper/function과 기존 심볼의 유사도 |
| 겉보기 정합성 | 컴파일과 테스트는 통과하지만 엣지 케이스에서 틀림 | 경계값, 권한 분기, pagination, race condition |
| 보안 경계 누락 | untrusted input, secret, token, 권한 범위가 잘못 연결 | PR body, issue body, commit message가 prompt나 shell로 흘러가는 경로 |
| 리뷰 피로 | 사람이 모든 PR을 깊게 추적할 수 없음 | 위험도 기반 우선순위와 근거 압축 |

기존 AI 리뷰 봇의 한계는 대부분 diff 중심으로 동작한다는 점이다. PR diff만 보면 변경된 줄은 보이지만, 그 변경이 프로젝트의 기존 설계 원칙과 맞는지, 이미 존재하는 유틸리티를 중복 구현했는지, 과거 리뷰에서 금지된 패턴을 반복하는지 판단하기 어렵다. 이 간극을 해결하려면 리뷰 도구가 레포지토리 전체 맥락을 안정적으로 읽고, 반복 가능한 방식으로 모델에 제공해야 한다.

여기서 MCP가 핵심이 된다. MCP 서버는 코드베이스와 메인테이너 정책을 Resources로 제공하고, 리뷰 실행과 피드백 저장을 Tools로 노출하며, PR 리뷰 유형별 템플릿을 Prompts로 제공할 수 있다.[5] 즉, MCP는 단순 API 호출 방식이 아니라 **리뷰 에이전트가 프로젝트 맥락을 표준화된 방식으로 획득하는 인터페이스**가 된다.

## **6. 제품 컨셉: 단순 리뷰 봇이 아니라 Maintainer Agent**

`signal-lens`의 목표는 "AI가 코멘트를 많이 달아주는 도구"가 아니다. 오히려 코멘트 수를 줄이고, 메인테이너가 바로 판단할 수 있는 고품질 신호를 제공해야 한다.

핵심 제품 경험은 다음과 같다.

1. PR이 열리면 GitHub Action이 실행된다.
2. 도구가 base/head diff, 변경 파일, 테스트 변경, 워크플로우 변경, 주요 심볼을 수집한다.
3. MCP Context Server가 레포지토리 구조, 기존 유틸리티, 메인테이너 규칙, 과거 false positive 피드백을 제공한다.
4. 리뷰 에이전트가 변경사항을 위험도별로 분류한다.
5. 결과는 PR 코멘트, SARIF, Markdown report, JSON artifact로 출력된다.
6. 메인테이너는 `/signal-lens explain`, `/signal-lens fix`, `/signal-lens false-positive`, `/signal-lens release-notes` 같은 명령으로 후속 작업을 지시한다.
7. 반복된 피드백은 프로젝트 로컬 저장소나 선택적 원격 DB에 저장되어 다음 리뷰에 반영된다.

초기 제품은 반드시 GitHub Action과 CLI로 시작해야 한다. MCP 서버는 차별화의 핵심이지만, 사용자가 처음 체감하는 진입점은 "내 PR에 바로 리뷰가 붙는다"여야 한다. 따라서 배포 순서는 `GitHub Action -> CLI -> MCP Server -> GitHub App` 순서가 현실적이다.

## **7. 시스템 아키텍처**

### **7.1 핵심 컴포넌트**

| 컴포넌트 | 역할 | MVP 포함 여부 |
| :--- | :--- | :--- |
| GitHub Action Runner | PR 이벤트에서 리뷰 실행 | 필수 |
| CLI (`signal-lens`) | 로컬 diff 리뷰, CI 디버깅, 레포지토리 인덱싱 | 필수 |
| MCP Context Server | 레포지토리 리소스, 리뷰 도구, 프롬프트 제공 | 1차 MVP 후반 또는 v0.2 |
| Context Indexer | Tree-sitter 기반 심볼 추출, dependency map, 중복 후보 탐색 | 필수 |
| Review Orchestrator | 보안, 아키텍처, 테스트, 유지보수 관점의 리뷰 작업 분배 | 필수 |
| Feedback Memory | false positive, accepted finding, maintainer rule 저장 | v0.2 |
| Release Assistant | changelog, migration note, release checklist 생성 | v0.3 |

### **7.2 MCP 인터페이스 설계**

MCP는 Tools, Resources, Prompts라는 빌딩 블록을 제공한다.[5] `signal-lens`는 이 세 가지를 다음처럼 정의한다.

#### **Resources**

| URI 예시 | 설명 |
| :--- | :--- |
| `repo://summary` | 레포지토리 구조, 언어, 패키지 매니저, 테스트 프레임워크 요약 |
| `repo://symbols/{name}` | 특정 함수, 클래스, 모듈의 정의와 참조 목록 |
| `repo://architecture/rules` | 메인테이너가 정의한 아키텍처 규칙 |
| `repo://reviews/history` | 과거 리뷰 결과와 false positive 기록 |
| `repo://release/current` | 현재 릴리스 상태, changelog, breaking change 후보 |

#### **Tools**

| Tool | 기능 |
| :--- | :--- |
| `review_pr` | PR diff와 컨텍스트를 받아 구조화된 리뷰 결과 생성 |
| `scan_ci_weakening` | CI, test, coverage, lint 완화 여부 탐지 |
| `find_duplicate_utility` | 신규 함수와 기존 심볼의 중복 가능성 탐색 |
| `trace_security_boundary` | untrusted input, secret, token, permission 경로 분석 |
| `record_feedback` | false positive 또는 accepted finding을 저장 |
| `draft_release_notes` | 병합된 PR 목록을 기반으로 릴리스 노트 초안 생성 |

#### **Prompts**

| Prompt | 용도 |
| :--- | :--- |
| `strict_pr_review` | 병합 차단 가능성이 있는 문제만 보고 |
| `maintainer_triage` | 이슈/PR 우선순위 분류 |
| `security_boundary_review` | 인증, 권한, secret, workflow 중심 점검 |
| `release_preparation` | changelog, migration note, compatibility risk 정리 |

MCP Tools는 모델이 호출할 수 있는 schema-defined 인터페이스로 제공되며, 도구 실행에는 명확한 입력 스키마와 출력 스키마를 둔다.[6] 특히 쓰기 권한이 필요한 기능은 human-in-the-loop를 기본값으로 해야 한다. PR 코멘트 작성, 라벨 부착, 수정 커밋 푸시, 릴리스 태그 생성 같은 작업은 자동 실행이 아니라 명시적 승인 후 실행되도록 설계한다.

### **7.3 리뷰 파이프라인**

1. **PR 수집 단계:** GitHub 이벤트에서 base/head SHA, changed files, diff, PR body, labels, author, CI 상태를 수집한다.
2. **위험도 분류 단계:** 변경 파일을 코드, 테스트, 문서, CI, dependency, security-sensitive area로 분류한다.
3. **컨텍스트 인덱싱 단계:** Tree-sitter 또는 언어별 parser로 신규/변경 심볼을 추출하고 기존 심볼과 비교한다.
4. **MCP 컨텍스트 주입 단계:** 레포지토리 규칙, 과거 리뷰 기록, architecture note, release note를 Resources로 가져온다.
5. **다중 관점 리뷰 단계:** security, correctness, architecture, tests, maintainability 관점의 에이전트가 독립적으로 분석한다.
6. **결과 합성 단계:** 중복 코멘트를 제거하고, 심각도, 근거, 재현 방법, 제안 수정안을 포함한 최종 리포트를 만든다.
7. **메인테이너 후속 작업 단계:** 슬래시 커맨드 또는 CLI 명령으로 설명, 수정안, false positive 기록, 릴리스 노트 생성을 수행한다.

## **8. MVP 범위와 구현 전략**

초기 MVP는 과하게 넓으면 안 된다. 첫 공개 버전은 "설치하면 바로 PR 리뷰가 붙고, 기존 AI 리뷰 봇보다 컨텍스트가 좋다"는 하나의 경험에 집중해야 한다.

### **8.1 v0.1 MVP**

v0.1에서 반드시 구현할 기능은 다음이다.

| 기능 | 설명 |
| :--- | :--- |
| GitHub Action 실행 | `pull_request` 이벤트에서 자동 실행 |
| CLI 로컬 실행 | `signal-lens review --base main --head HEAD` 형태 지원 |
| Diff 요약 | 변경 목적, 변경 범위, 위험 파일 목록 출력 |
| CI 약화 탐지 | workflow, test config, coverage/lint 변경 점검 |
| 중복 유틸리티 탐지 | 신규 함수/파일과 기존 심볼 간 유사도 탐색 |
| 보안 경계 체크 | token, secret, permission, untrusted input 흐름 점검 |
| Markdown 리뷰 리포트 | PR 코멘트로 붙일 수 있는 짧은 결과 생성 |
| JSON 결과 출력 | 후속 자동화를 위한 machine-readable artifact 제공 |

v0.1에서는 자동 수정 커밋까지 넣지 않는 것이 좋다. 자동 수정은 제품의 매력은 크지만 보안, 권한, 신뢰성 리스크가 커서 초기 품질을 흔들 수 있다. 먼저 "정확히 잡아내는 리뷰어"가 되어야 한다.

### **8.2 v0.2**

v0.2에서는 MCP 서버와 피드백 메모리를 추가한다.

| 기능 | 설명 |
| :--- | :--- |
| MCP Context Server | repo resources, review tools, prompts 제공 |
| `.signal-lens.yml` | 프로젝트별 리뷰 정책 파일 |
| Feedback Memory | false positive, accepted finding, ignored rule 저장 |
| SARIF 출력 | GitHub Code Scanning과 연동 가능한 결과 출력 |
| PR 코멘트 명령 | `/signal-lens explain`, `/signal-lens false-positive` 지원 |

### **8.3 v0.3**

v0.3에서는 메인테이너 자동화 범위를 넓힌다.

| 기능 | 설명 |
| :--- | :--- |
| Release Assistant | merged PR 기반 changelog, breaking change, migration note 생성 |
| Issue Triage | 이슈 중복 탐지, 라벨 추천, 재현 정보 요청 |
| Auto-fix Draft | 승인 후 적용 가능한 patch 초안 생성 |
| GitHub App | Action보다 편한 설치 경험 제공 |
| Multi-provider | OpenAI 중심 구현 위에 다른 모델 provider 연결 가능 구조 |

## **9. 기술 스택 제안**

초기 구현은 TypeScript 중심이 가장 적합하다. GitHub Action, GitHub API, MCP SDK, npm 배포와의 궁합이 좋고, 오픈소스 기여자 유입도 쉽다.

| 영역 | 권장 기술 |
| :--- | :--- |
| CLI | TypeScript + Node.js |
| GitHub Action | Composite Action 또는 JavaScript Action |
| MCP Server | TypeScript MCP SDK |
| 코드 파싱 | Tree-sitter |
| 설정 파일 | `.signal-lens.yml` |
| 로컬 저장소 | SQLite |
| 결과 포맷 | Markdown, JSON, SARIF |
| 모델 호출 | OpenAI API, provider abstraction |
| 테스트 | Vitest, fixture-based integration tests |

Python은 코드 분석 생태계가 강하지만, GitHub Action과 MCP 서버의 배포 단순성을 고려하면 TypeScript로 시작하는 편이 낫다. 단, Python 프로젝트 리뷰를 잘하기 위해 Python parser나 language-specific analyzer는 플러그인 형태로 추가할 수 있다.

## **10. 차별화 전략**

AI PR 리뷰 도구는 이미 존재한다. 따라서 `signal-lens`가 성공하려면 "또 하나의 리뷰 봇"처럼 보여서는 안 된다. 차별화 포인트는 다음 다섯 가지로 고정해야 한다.

### **10.1 Diff-only 리뷰가 아니라 Context-first 리뷰**

기존 도구가 PR diff를 중심으로 판단한다면, `signal-lens`는 레포지토리 전체 구조, 기존 심볼, 메인테이너 정책, 과거 리뷰 피드백을 함께 본다. 특히 신규 유틸리티, 중복 validation, 권한 체크 누락, CI 약화 같은 "diff만 봐서는 놓치기 쉬운 문제"에 집중한다.

### **10.2 MCP 호환성**

MCP 서버를 제공하면 Codex, IDE, CLI, 다른 에이전트가 같은 컨텍스트를 재사용할 수 있다. 즉, 이 프로젝트는 단일 SaaS가 아니라 **AI 코딩 에이전트를 위한 리뷰 컨텍스트 인프라**가 된다.

### **10.3 메인테이너 자동화**

리뷰 코멘트 생성에 머무르지 않고 이슈 트리아지, 릴리스 노트, migration note, dependency update risk 분석까지 확장한다. OpenAI 프로그램 신청 시에도 이 포지션이 중요하다. 공식 프로그램이 PR review뿐 아니라 maintainer automation과 release workflows를 지원 대상으로 언급하기 때문이다.[1]

### **10.4 증거 기반 출력**

모든 finding은 다음 구조를 가져야 한다.

| 필드 | 설명 |
| :--- | :--- |
| Severity | blocker, high, medium, low |
| Evidence | 파일, 라인, 관련 심볼, 관련 설정 |
| Reason | 왜 문제가 되는지 |
| Suggested action | 사람이 바로 적용할 수 있는 조치 |
| Confidence | 모델 판단 신뢰도 |
| Repro/Test | 가능하면 실패 테스트나 확인 명령 |

이 구조가 있어야 AI 코멘트가 "의견"이 아니라 "검토 가능한 리뷰 결과"가 된다.

### **10.5 Human-in-the-loop 기본값**

초기 버전에서 자동 병합, 자동 푸시, 자동 릴리스는 금지해야 한다. 쓰기 작업은 승인 기반으로 설계하고, GitHub token 권한은 최소화해야 한다. GitHub의 AI PR 리뷰 가이드도 LLM이 workflow, prompt, shell, token 권한과 연결될 때 untrusted input과 secret 노출 위험을 주의해야 한다고 지적한다.[7]

## **11. OpenAI 지원 신청 전략**

### **11.1 신청서 핵심 메시지**

OpenAI 신청서에는 "AI 코드 리뷰 도구를 만들겠다"보다 더 구체적인 표현이 필요하다. 핵심 메시지는 다음과 같아야 한다.

> `signal-lens` is an open-source maintainer automation agent that uses MCP to provide repository-level context for AI-powered pull request review, issue triage, and release workflows. It helps maintainers review agent-generated PRs by detecting CI weakening, duplicated utilities, security boundary regressions, missing tests, and release risks with evidence-based findings.

### **11.2 Why does this repository qualify? 초안**

영문 신청서에 넣을 수 있는 500자 내외 초안은 다음과 같다.

> signal-lens helps OSS maintainers handle the growing volume of AI-generated pull requests. It uses MCP to expose repository context, maintainer rules, prior review feedback, and release metadata to AI reviewers. The project directly targets PR review, maintainer automation, and release workflows by detecting CI weakening, duplicated utilities, security boundary regressions, and missing tests with evidence-based findings.

### **11.3 Product usage plan 초안**

> We will use Codex and OpenAI API credits to run multi-pass PR reviews, summarize repository architecture, classify risk areas, generate maintainer-focused review comments, triage issues, and draft release notes. API usage is central to the product: each PR review combines diff analysis, repository context retrieval through MCP, security boundary checks, and structured output generation for GitHub comments, SARIF, and release artifacts.

### **11.4 신청 전 준비해야 할 저장소 상태**

OpenAI 지원을 신청하기 전 최소한 다음은 갖춰야 한다.

1. 퍼블릭 GitHub 저장소
2. Apache-2.0 또는 MIT 라이선스
3. README에 문제 정의, 설치법, GitHub Action 예제 포함
4. `.github/workflows/signal-lens.yml` 예제
5. 최소 3개 fixture PR에 대한 리뷰 결과 스냅샷
6. `docs/architecture.md`
7. `docs/security.md`
8. `docs/openai-codex-for-oss-plan.md`
9. CONTRIBUTING.md와 CODE_OF_CONDUCT.md

## **12. 6개월 실행 로드맵**

### **12.1 1개월 차: MVP와 신청 준비**

1개월 차 목표는 "작동하는 GitHub Action"이다.

| 주차 | 목표 |
| :--- | :--- |
| 1주차 | 저장소 생성, README, CLI skeleton, Action skeleton |
| 2주차 | PR diff 수집, 변경 파일 분류, Markdown 리포트 출력 |
| 3주차 | CI 약화 탐지, 중복 유틸리티 탐지, 보안 경계 체크 |
| 4주차 | OpenAI API 연동, fixture 테스트, OpenAI 지원 신청 |

### **12.2 2~3개월 차: Context-first 리뷰 완성**

2~3개월 차에는 MCP Context Server와 레포지토리 인덱서를 완성한다.

| 작업 | 산출물 |
| :--- | :--- |
| Tree-sitter 인덱서 | symbol graph, import graph, function summary |
| MCP resources | `repo://summary`, `repo://symbols/{name}`, `repo://architecture/rules` |
| 설정 파일 | `.signal-lens.yml` |
| SARIF 출력 | GitHub Code Scanning 연동 |
| 리뷰 품질 개선 | false positive 기록 및 fixture regression tests |

### **12.3 4~5개월 차: 메인테이너 자동화 확장**

이 단계에서는 PR 리뷰를 넘어 메인테이너 업무 자동화를 추가한다.

| 기능 | 목표 |
| :--- | :--- |
| Issue triage | 중복 이슈, missing reproduction, priority label 추천 |
| Release assistant | changelog, breaking change, migration note 생성 |
| Slash command | PR 코멘트 기반 explain, false-positive, release-notes |
| GitHub App 설계 | Action 기반 사용자의 설치 마찰 감소 |

### **12.4 6개월 차: 커뮤니티 채택과 신뢰성 강화**

마지막 단계의 목표는 "좋은 데모"가 아니라 "계속 쓰이는 오픈소스 도구"다.

| 목표 | 실행 |
| :--- | :--- |
| 채택 사례 | 실제 오픈소스 저장소 3~5개에 적용 |
| 벤치마크 | 기존 AI 리뷰 도구 대비 false positive, accepted finding 비교 |
| 보안 문서화 | token permission, prompt injection, secret handling 정책 공개 |
| 플러그인 구조 | 언어별 analyzer와 provider adapter 분리 |
| 커뮤니티 | good first issue, roadmap, discussion 운영 |

## **13. 보안 및 권한 설계**

이 프로젝트는 PR 본문, 코드 diff, 이슈, 커밋 메시지, CI 설정, secret 접근 가능성이 있는 workflow를 다루므로 보안 설계를 초기에 명확히 해야 한다.

핵심 원칙은 다음과 같다.

1. 기본 GitHub token 권한은 read-only로 시작한다.
2. PR 코멘트 작성은 별도 job 또는 명시 권한에서만 수행한다.
3. fork PR에서는 secret을 사용하지 않는다.
4. 모델 출력은 shell command로 직접 실행하지 않는다.
5. auto-fix는 patch proposal까지만 기본 제공하고, 적용은 메인테이너 승인 후 수행한다.
6. PR body, issue body, commit message는 untrusted input으로 취급한다.
7. MCP tool annotation과 tool schema는 신뢰 경계를 명확히 표시한다.
8. 리뷰 결과에는 confidence와 evidence를 포함해 사람이 검증할 수 있게 한다.

이 보안 모델은 제품 신뢰성뿐 아니라 OpenAI 지원 신청에도 중요하다. Codex Security 접근을 신청하려면, 프로젝트 자체가 높은 권한을 다루는 도구라는 점과 이를 통제하기 위한 구조가 명확해야 한다.

## **14. 성공 지표**

초기 오픈소스 프로젝트는 별점 수만 목표로 삼으면 안 된다. 이 프로젝트의 핵심 지표는 메인테이너 업무 감소와 리뷰 품질이다.

| 지표 | 측정 방법 |
| :--- | :--- |
| 리뷰 시간 감소 | 도입 전후 PR review latency 비교 |
| Accepted finding 비율 | AI가 제기한 finding 중 실제 수정으로 이어진 비율 |
| False positive 비율 | 메인테이너가 false-positive로 표시한 비율 |
| CI 약화 탐지 수 | workflow/test/coverage 변경에서 탐지한 blocker 수 |
| 중복 유틸리티 탐지 수 | 기존 함수 재사용으로 이어진 코멘트 수 |
| 릴리스 자동화 절감 | changelog/release note 작성 시간 비교 |
| 재사용성 | Action, CLI, MCP Server 각각의 설치 수와 사용 사례 |

OpenAI 신청서나 README에도 이 지표를 명시하면 좋다. 지원 프로그램은 단순한 데모보다 유지보수 생태계에 미치는 실제 영향을 중요하게 볼 가능성이 높기 때문이다.

## **15. 결론: 하나만 한다면 이 프로젝트가 가장 맞다**

**MCP 기반 AI PR 리뷰 및 메인테이너 자동화 에이전트**는 지금 당장 GitHub Action 형태로 배포할 수 있고, OpenAI Codex for OSS 프로그램의 지원 항목과 직접적으로 맞으며, AI 생성 코드 증가라는 시장 문제에 정면으로 대응한다. 또한 MCP 기반 컨텍스트 계층을 포함하기 때문에 단순 리뷰 봇보다 더 깊은 레포지토리 이해를 제공할 수 있고, 릴리스 및 이슈 트리아지 자동화로 자연스럽게 확장할 수 있다.

이 프로젝트의 핵심은 "AI가 리뷰를 대신한다"가 아니다. 더 정확한 정의는 **AI가 메인테이너의 판단에 필요한 컨텍스트와 근거를 압축해주는 리뷰 인프라**다. MCP는 이 컨텍스트를 표준화하는 계층이고, GitHub Action은 사용자가 즉시 체감하는 실행 계층이며, OpenAI API는 다중 관점 분석과 자연어 요약을 수행하는 추론 계층이다.

따라서 문서와 실행 계획은 앞으로 하나의 메시지로 정리해야 한다.

> 우리는 단순한 PR 리뷰 봇을 만드는 것이 아니라, MCP를 통해 레포지토리의 구조적 맥락을 읽고, AI 생성 코드의 위험을 증거 기반으로 검증하며, 오픈소스 메인테이너의 반복 업무를 줄이는 자동화 에이전트를 만든다.

이 방향이 OpenAI 지원 프로그램의 목적, 2026년 개발자 생태계의 흐름, 실제 오픈소스 메인테이너의 고통 지점, 그리고 소규모 팀의 구현 가능성을 가장 균형 있게 만족한다.

## **16. 실행 현황 (2026-06-19 업데이트)**

기획서 §8의 v0.1~v0.3 로드맵은 **v1.0.0에서 전부 구현 완료**되었고, 이후 v2.0.0·v2.0.0에서 추가 개선이 이루어졌다.

| 기획 항목 | 계획 버전 | 구현 상태 | 실제 버전 |
| :--- | :--- | :--- | :--- |
| GitHub Action, CLI, 정적 분석 | v0.1 | ✅ 완료 | v1.0.0 |
| MCP Context Server (5R/6T/4P) | v0.2 | ✅ 완료 (+1 tool) | v2.0.0 (7 tools) |
| 피드백 메모리, SARIF, `.signal-lens.yml` | v0.2 | ✅ 완료 | v1.0.0 |
| 릴리스·트리아지·슬래시·App 스켈레톤 | v0.3 | ✅ 완료 (App은 스켈레톤) | v1.0.0 |
| Ollama 로컬 AI 프로바이더 | — | ✅ 추가 | v2.0.0 |
| 인라인 PR 코멘트 | — | ✅ 추가 | v2.0.0 |
| test-coverage 분석기 | — | ✅ 추가 | v2.0.0 |
| Cursor MCP 디스크립터 (`mcps/`) | — | ✅ 추가 | v2.0.0 |
| npm publish | — | ⏸ 보류 | — |
| GitHub App 실제 배포 | v0.3 | ⏸ 보류 | 스켈레톤만 |
| 런타임 증거 기반 리뷰 | 장기 | ⏸ 보류 | 기획대로 |

**저장소:** https://github.com/simhanson123/signal-lens  
**현재 릴리스:** v2.0.0 (44 tests, 4 fixture scenarios)  
**표시명:** Context-first PR review for open-source maintainers  
**인수인계:** `signal-lens/docs/handover-2026-06-19.md`

### 브랜딩 (v2.0.0)

| 항목 | 내용 |
|------|------|
| slug | `signal-lens` (유지 — CLI, npm, Action) |
| 제품 정체 | 메인테이너 PR 리뷰 인프라 |
| 진입점 | Skill → CLI/Action → MCP (optional) |
| 피할 표현 | "MCP 기반 AI PR 리뷰 에이전트"를 제품명처럼 사용 |

#### **참고 자료**

1. Codex for Open Source | OpenAI Developers, 2026년 6월 16일 확인, [https://developers.openai.com/community/codex-for-oss](https://developers.openai.com/community/codex-for-oss)
2. Codex for Open Source Program Terms | OpenAI Developers, 2026년 6월 16일 확인, [https://developers.openai.com/codex/codex-for-oss-terms](https://developers.openai.com/codex/codex-for-oss-terms)
3. GitHub Action | Codex | OpenAI Developers, 2026년 6월 16일 확인, [https://developers.openai.com/codex/github-action](https://developers.openai.com/codex/github-action)
4. Architecture overview | Model Context Protocol, 2026년 6월 16일 확인, [https://modelcontextprotocol.io/docs/learn/architecture](https://modelcontextprotocol.io/docs/learn/architecture)
5. Understanding MCP servers | Model Context Protocol, 2026년 6월 16일 확인, [https://modelcontextprotocol.io/docs/learn/server-concepts](https://modelcontextprotocol.io/docs/learn/server-concepts)
6. Tools | Model Context Protocol Specification, 2026년 6월 16일 확인, [https://modelcontextprotocol.io/specification/2025-06-18/server/tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
7. Agent pull requests are everywhere. Here's how to review them. | GitHub Blog, 2026년 6월 16일 확인, [https://github.blog/ai-and-ml/generative-ai/agent-pull-requests-are-everywhere-heres-how-to-review-them/](https://github.blog/ai-and-ml/generative-ai/agent-pull-requests-are-everywhere-heres-how-to-review-them/)
