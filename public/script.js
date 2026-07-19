// StadiumGuide AI — client-side logic
// IMPORTANT: This file never contains an API key. All AI calls go through
// /api/ask, a server-side function that keeps the Gemini API key secret.

const form = document.getElementById("request-form");
const queryInput = document.getElementById("query-input");
const languageSelect = document.getElementById("language-select");
const submitBtn = document.getElementById("submit-btn");
const responseBox = document.getElementById("response-box");
const modelSource = document.getElementById("model-source");
const statusMessage = document.getElementById("status-message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const quickAction = form.querySelector('input[name="quick-action"]:checked')?.value || "";
  const typedQuery = queryInput.value.trim();
  const finalQuery = quickAction
    ? (typedQuery ? `${quickAction}. Additional context: ${typedQuery}` : quickAction)
    : typedQuery;

  if (!finalQuery) {
    announceStatus("Please describe the request or choose a quick action first.");
    queryInput.focus();
    return;
  }

  setLoadingState(true);
  announceStatus("Getting directions, please wait...");

  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: finalQuery,
        language: languageSelect.value,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const data = await response.json();
    renderResponse(data.answer, data.source, data.urgent);
    announceStatus("Directions ready.");
  } catch (error) {
    console.error("StadiumGuide AI request failed:", error);
    renderResponse(
      "Sorry, something went wrong reaching the assistant. Please try again, or consult your supervisor directly for this request.",
      "ERROR",
      false
    );
    announceStatus("There was an error. Please try again.");
  } finally {
    setLoadingState(false);
  }
});

function setLoadingState(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? "Getting directions…" : "Get Directions";
}

function renderResponse(text, source, isUrgent) {
  responseBox.textContent = text;
  responseBox.classList.toggle("urgent", Boolean(isUrgent));
  responseBox.focus();
  modelSource.textContent = source ? `Answered by: ${source}` : "";
}

function announceStatus(message) {
  statusMessage.textContent = message;
}
