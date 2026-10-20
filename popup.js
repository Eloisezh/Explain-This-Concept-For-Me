document.addEventListener("DOMContentLoaded", async () => {
  const selectedTextDiv = document.getElementById("selected-text");
  const resultDiv = document.getElementById("result");
  const explainBtn = document.getElementById("explain-btn");

  // 获取当前标签页选中的文本
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: () => window.getSelection().toString(),
    },
    async (injectionResults) => {
      if (injectionResults && injectionResults[0]) {
        const selectedText = injectionResults[0].result.trim();
        if (selectedText) {
          selectedTextDiv.textContent = selectedText;
          window.currentSelectedText = selectedText;
        } else {
          selectedTextDiv.textContent = "未检测到选中的文字，请先划线选择。";
        }
      }
    },
  );

  // 点击按钮后调用 Gemini API
  explainBtn.addEventListener("click", async () => {
    const textToExplain = window.currentSelectedText;
    if (!textToExplain) {
      resultDiv.textContent = "没有可解释的内容。";
      return;
    }

    resultDiv.textContent = "Gemini 正在思考中...";

    try {
      const explanation = await callGeminiAPI(textToExplain);
      resultDiv.textContent = explanation;
    } catch (error) {
      resultDiv.textContent = "调用 AI 失败: " + error.message;
    }
  });
});

// 调用官方 Gemini API 的函数
async function callGeminiAPI(text) {
  const API_KEY = "API-key"; // 替换为你从 Google AI Studio 获取的 Key

  // 使用当前最推荐的免费且极速的 gemini-2.5-flash 模型
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `用非计算机专业学生也能理解的类比来解释下面这段短语或句子的含义，避免使用晦涩难懂的专业术语，包含专业定义和解释，保持在一句话或一小段话以内：\n\n${text}`,
            },
          ],
        },
      ],
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }

  // 解析 Gemini 返回的响应结构
  try {
    return data.candidates[0].content.parts[0].text;
  } catch (e) {
    throw new Error("解析 Gemini 响应数据格式出错");
  }
}

explainBtn.addEventListener("click", async () => {
  const textToExplain = window.currentSelectedText;
  if (!textToExplain) {
    resultDiv.textContent = "没有可解释的内容。";
    return;
  }

  resultDiv.innerHTML = '<span style="color:#666;">AI 正在思考中...</span>';

  try {
    const rawMarkdown = await callGeminiAPI(textToExplain);

    // 使用 marked 将 AI 返回的 Markdown 解析为规范的 HTML
    if (typeof marked !== "undefined") {
      resultDiv.innerHTML = marked.parse(rawMarkdown);
    } else {
      resultDiv.textContent = rawMarkdown;
    }
  } catch (error) {
    resultDiv.textContent = "调用 AI 失败: " + error.message;
  }
});
