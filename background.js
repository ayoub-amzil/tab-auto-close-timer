// Object to store countdown data for each tab
let countdownData = {};

// Load saved countdown data from storage
chrome.storage.local.get("countdownData", (result) => {
  if (result.countdownData) {
    countdownData = result.countdownData;
    console.log("Loaded countdown data:", countdownData);

    // Restart countdowns for tabs that were running
    for (const tabId in countdownData) {
      if (countdownData[tabId].countdownRunning) {
        console.log("Restarting countdown for tab:", tabId);
        startCountdown(parseInt(tabId, 10), countdownData[tabId].countdownValue);
      }
    }
  }
});

// Function to start a countdown for a tab
function startCountdown(tabId, countdownValue) {
  console.log("Starting countdown for tab:", tabId, "with value:", countdownValue);

  countdownData[tabId] = {
    countdownValue: countdownValue,
    countdownRunning: true,
  };

  // Save the updated countdown data
  chrome.storage.local.set({ countdownData }, () => {
    console.log("Saved countdown data for tab:", tabId);
  });

  // Start the countdown
  decrementCountdown(tabId);
}

// Function to decrement the countdown
function decrementCountdown(tabId) {
  if (countdownData[tabId]) {
    countdownData[tabId].countdownValue -= 1;
    console.log("Decremented countdown for tab:", tabId, "to:", countdownData[tabId].countdownValue);

    // Send the updated countdown value to the popup
    chrome.runtime.sendMessage({
      action: "updateCountdown",
      tabId: tabId,
      countdownValue: countdownData[tabId].countdownValue,
    });

    // If countdown reaches 0, close the tab
    if (countdownData[tabId].countdownValue <= 0) {
      console.log("Countdown finished for tab:", tabId);
      chrome.tabs.remove(tabId, () => {
        console.log("Closed tab:", tabId);
        delete countdownData[tabId];
        chrome.storage.local.set({ countdownData }, () => {
          console.log("Removed countdown data for tab:", tabId);
        });
      });
    } else {
      // Continue the countdown
      setTimeout(() => {
        decrementCountdown(tabId);
      }, 1000); // 1 second
    }

    // Save the updated countdown data
    chrome.storage.local.set({ countdownData }, () => {
      console.log("Updated countdown data for tab:", tabId);
    });
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startCountdown") {
    startCountdown(request.tabId, request.countdownValue);
    sendResponse({ success: true });
  } else if (request.action === "stopCountdown") {
    stopCountdown(request.tabId);
    sendResponse({ success: true });
  } else if (request.action === "getCountdownData") {
    sendResponse(countdownData);
  }
});

// Function to stop the countdown for a tab
function stopCountdown(tabId) {
  if (countdownData[tabId]) {
    console.log("Stopping countdown for tab:", tabId);
    delete countdownData[tabId];
    chrome.storage.local.set({ countdownData }, () => {
      console.log("Removed countdown data for tab:", tabId);
    });
  }
}

// Open the dashboard when the browser action is clicked
chrome.browserAction.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});