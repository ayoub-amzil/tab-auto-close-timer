let autoRefreshInterval; // Variable to store the auto-refresh interval
let isRefreshing = false; // Variable to track if the table is currently refreshing

// Function to fetch all open tabs and display them in the table
function updateTable() {
  if (isRefreshing) return; // Prevent multiple simultaneous refreshes
  isRefreshing = true;

  chrome.tabs.query({}, (tabs) => {
    const tableBody = document.querySelector("#websiteTable tbody");
    tableBody.innerHTML = ""; // Clear existing rows

    // Fetch the current countdown data from the background script
    chrome.runtime.sendMessage({ action: "getCountdownData" }, (countdownData) => {
      tabs.forEach((tab) => {
        const row = document.createElement("tr");

        // Column 1: Title
        const titleCell = document.createElement("td");
        titleCell.textContent = tab.title;
        row.appendChild(titleCell);

        // Column 2: URL
        const urlCell = document.createElement("td");
        urlCell.textContent = tab.url;
        row.appendChild(urlCell);

        // Column 3: Close (Toggle Switch, Input Number, Button)
        const closeCell = document.createElement("td");

        // Toggle Switch (Checkbox)
        const toggleSwitch = document.createElement("label");
        toggleSwitch.className = "toggle-switch";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        const slider = document.createElement("span");
        slider.className = "toggle-slider";
        toggleSwitch.appendChild(checkbox);
        toggleSwitch.appendChild(slider);
        closeCell.appendChild(toggleSwitch);

        // Input Number
        const inputNumber = document.createElement("input");
        inputNumber.type = "number";
        inputNumber.min = "1";
        inputNumber.value = countdownData[tab.id]?.countdownValue || "1";
        inputNumber.disabled = true; // Disable by default
        closeCell.appendChild(inputNumber);

        // Button
        const button = document.createElement("button");
        button.textContent = "Close";
        button.disabled = true; // Disable by default

        // Set the initial state of the toggle and button
        if (countdownData[tab.id]?.countdownRunning) {
          checkbox.checked = true;
          inputNumber.disabled = false;
          button.disabled = false;
        }

        button.addEventListener("click", () => {
          if (checkbox.checked) {
            // Send a message to the background script to start the countdown
            chrome.runtime.sendMessage(
              {
                action: "startCountdown",
                tabId: tab.id,
                countdownValue: parseInt(inputNumber.value, 10),
              },
              (response) => {
                if (response?.success) {
                  console.log("Countdown started for tab:", tab.id);
                } else {
                  console.error("Failed to start countdown for tab:", tab.id);
                }
              }
            );
          }
        });

        closeCell.appendChild(button);

        // Add event listener to the checkbox
        checkbox.addEventListener("change", () => {
          if (!checkbox.checked) {
            // If the toggle is turned off:
            // 1. Disable the input and button
            inputNumber.disabled = true;
            button.disabled = true;

            // 2. Reset the input value to 1
            inputNumber.value = "1";

            // 3. Stop the countdown (if running)
            chrome.runtime.sendMessage(
              {
                action: "stopCountdown",
                tabId: tab.id,
              },
              (response) => {
                if (response?.success) {
                  console.log("Countdown stopped for tab:", tab.id);
                } else {
                  console.error("Failed to stop countdown for tab:", tab.id);
                }
              }
            );
          } else {
            // If the toggle is turned on:
            // Enable the input and button
            inputNumber.disabled = false;
            button.disabled = false;
          }
        });

        // Listen for countdown updates from the background script
        chrome.runtime.onMessage.addListener((request) => {
          if (request.action === "updateCountdown" && request.tabId === tab.id) {
            inputNumber.value = request.countdownValue;
          }
        });

        row.appendChild(closeCell);
        tableBody.appendChild(row);
      });

      // Initialize DataTables
      $('#websiteTable').DataTable();

      isRefreshing = false;
    });
  });
}

// Function to start auto-refresh
function startAutoRefresh() {
  autoRefreshInterval = setInterval(updateTable, 10000); // Refresh every 10 seconds
}

// Function to stop auto-refresh
function stopAutoRefresh() {
  clearInterval(autoRefreshInterval);
}

// Function to toggle dark mode
function toggleDarkMode() {
  const body = document.body;
  body.classList.toggle("dark-mode");

  // Save the user's preference
  const isDarkMode = body.classList.contains("dark-mode");
  chrome.storage.local.set({ darkMode: isDarkMode });

  // Update the button icon
  const darkModeButtonIcon = document.querySelector("#darkModeButton i");
  if (isDarkMode) {
    darkModeButtonIcon.classList.remove("fa-moon");
    darkModeButtonIcon.classList.add("fa-sun");
  } else {
    darkModeButtonIcon.classList.remove("fa-sun");
    darkModeButtonIcon.classList.add("fa-moon");
  }
}

// Load the user's dark mode preference
chrome.storage.local.get("darkMode", (result) => {
  if (result.darkMode) {
    document.body.classList.add("dark-mode");
    const darkModeButtonIcon = document.querySelector("#darkModeButton i");
    darkModeButtonIcon.classList.remove("fa-moon");
    darkModeButtonIcon.classList.add("fa-sun");
  }
});

// Update the table when the dashboard is opened
document.addEventListener("DOMContentLoaded", () => {
  // Initial table update
  updateTable();

  // Start auto-refresh by default
  startAutoRefresh();

  // Manual Refresh Button
  document.getElementById("refreshButton").addEventListener("click", () => {
    updateTable();
  });

  // Auto-Refresh Switch
  document.getElementById("autoRefreshToggle").addEventListener("change", (event) => {
    if (event.target.checked) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });

  // Dark Mode Button
  document.getElementById("darkModeButton").addEventListener("click", toggleDarkMode);
});