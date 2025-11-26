import express from 'express';
import api from './api.js';

const app = express();
const PORT = 4000;

app.use('/api', api)


/* // Root → redirect to the real static index path so relative URLs work
app.get("/", (req, res) => {
  res.redirect("/scripts/index.html");
});
// Optional: convenience route for the editor root
app.get("/editor", (req, res) => {
  res.redirect("/editor/editor.html");
}); */

/* function openInBrowser(url) {
  const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  const command = process.platform === "win32" ? `${opener} "" "${url}"` : `${opener} "${url}"`;
  exec(command, (err) => {
    if (err) console.error(`Failed to open ${url}: ${err.message}`);
  });
}

function promptToOpen(port) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const baseUrl = `http://localhost:${port}`;
  const editorUrl = `${baseUrl}/editor`;

  console.log("\n브라우저에서 바로 열까요?");
  console.log(`  1) ${baseUrl}`);
  console.log(`  2) ${editorUrl}`);
  console.log("  3) 둘 다 열기");
  console.log("  0) 열지 않음");

  rl.question("번호 입력 후 Enter (기본: 0): ", (answer) => {
    const choice = (answer || "").trim();
    if (choice === "1") {
      openInBrowser(baseUrl);
    } else if (choice === "2") {
      openInBrowser(editorUrl);
    } else if (choice === "3") {
      openInBrowser(baseUrl);
      openInBrowser(editorUrl);
    } else {
      console.log("브라우저 열기를 건너뜁니다.");
    }
    rl.close();
  });
} */

app.listen(PORT, () => {
  console.log(`Rooms server running at http://localhost:${PORT}`);
  // promptToOpen(PORT);
});
