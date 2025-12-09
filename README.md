# HMH - **한세대학교 3D 캠퍼스맵**

> **한세대학교 학생들을 위한 맞춤형 3D 지도 서비스**

기존 상용 지도 서비스(네이버, 카카오, 구글 지도)에서는 대학교 캠퍼스 내의 상세한 지리 정보를 제공하지 않는 경우가 많습니다. 특히 신입생이나 방문객들은 넓은 캠퍼스 내에서 원하는 건물이나 특정 강의실을 찾는 데 어려움을 겪습니다.

<br>

HMH은 한세대학교 학생들에게 **직관적이고 맞춤형 3D 지도**를 제공하는 웹 서비스 입니다.

<br>

## ✨ 주요 기능

### 직접 커스텀 하는 학교 평면도

- 학교 건물 데이터 위에 직접 올리는 강의실 폴리곤
- 폴리곤 이동, 복사/붙여넣기 등 편의성 제공
- 평면도 편집 후 바로 업데이트

### 건물 별 층/평면도 조회

- 건물의 층 별 강의실 3D 평면도 제공
- 사이드바를 이용한 편리한 검색 및 조회
- 원하는 강의실 즐겨찾기 기능
- 해당 강의실의 상세설명을 제공하는 툴팁 기능

<br>

## 🛠️ 기술 스택

### Front

- **Framework** : React 19 + React Dom, Vite 7
- **Language** : JavaScript
- **Package Manager** : npm

### Back

- **Framework** : Node/Express 5 server와 CORS
- **Language** : JavaScript
- **Package Manager** : npm

### Development Tools

- **Runtime**: Node.js
- **Linting**: ESLint
- **Version Control**: Git

<br>

## ⚙️ 시스템 구성도

<img height="400" alt="KakaoTalk_20251209_180751255" src="https://github.com/user-attachments/assets/799c0981-3e15-4142-94f0-6497fe2e0d61" />
<img height="400" alt="KakaoTalk_20251209_180751255_01" src="https://github.com/user-attachments/assets/89ebddd6-4204-46c5-bd02-4d0ac32f4716" />


<br>
<br>

## 📦 설치 및 실행

### 사전 요구사항

- Node.js 18.0.0 이상

### **Quick Start (development)**

1. back

```markdown
	 cd back
   npm install
   npm run start
   
   Starts the API on http://localhost:4000 (and serves `/editor`).
```

 2. Frontend

```jsx
	 cd front
   npm install
   npm run start
```

<br>

## 📁 프로젝트 구조

```
├── assets/                   
│   └── logo               # 로고파일           
├── components/           
│   ├── map/               # 지도 컴포넌트
│   ├── sidebar/           # 사이드바UI 컴포넌트
│   ├── App.jsx         
│   └── App.css
├── scripts/         
│   ├── mapConfig.js
│   ├── mapHandlers.js
│   ├── mapUtils.js
│   └── sideBarUtils.js
└── main.jsx
```

<br>

## 🚀 배포

…

<br>

## 👥 개발팀

- 태형 - Frontend
- 정호 - Frontend
- 태영 - Backend
- 유진 - Backend
