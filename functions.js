// ---------- State ----------
const DEFAULTS = { sstRate: 8, svcRate: 10 };
const $ = (id) => document.getElementById(id);

const state = {
  entry: "", // the number being typed
  items: [], // committed numbers
  sstEnabled: false, // is sst enabled or not
  sstRate: DEFAULTS.sstRate, // sst rate from DEFAULT state
  svcEnabled: false, // is service tax enabled or not
  svcRate: DEFAULTS.svcRate, // service rate from DEFAULT state
  theme: "light", // dark vs light theme
  log: [], // log of previous meals
};

// ---------- Time (Malaysia Time) ----------
function tickNow() {
  const opts = {
    hour12: false,
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Kuala_Lumpur",
  };
  $("now").textContent = new Date().toLocaleString("en-MY", opts); // writes the time info into the HTML element with now ID
}
setInterval(tickNow, 1000); // set the time every second
tickNow(); // run ticknow

// ---------- Theme ----------
// toggle light or dark theme
function applyTheme(theme) {
  document.documentElement.setAttribute("data-bs-theme", theme);
  $("themeToggle").checked = theme === "dark";
}

// ---------- Saving and Loading ----------
// save the state values (the numbers that user key in) into "items-in-meal" storage in local storage
function save() {
  localStorage.setItem("items-in-meal", JSON.stringify(state));
}

// load the items from "items-in-meal"
function load() {
  const items_in_meal = localStorage.getItem("items-in-meal");
  // if items in meal exist, then assign those items from obj to the state
  if (items_in_meal) {
    const obj = JSON.parse(items_in_meal);
    Object.assign(state, obj);
  }
  // if local storage empty then return nothing
  return;
}

// save the meals into the log in meal-log in local storage
function saveLog() {
  localStorage.setItem("meal-log", JSON.stringify(state.log));
}

// get the meals in meal-log from local storage
function loadLog() {
  const meal_log = localStorage.getItem("meal-log");
  if (meal_log) {
    state.log = JSON.parse(meal_log) || [];
  }
  return;
}

// ---------- Calculations ----------
// convert into number, if not number, return 0
function toNumber(s) {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// basically without total meal price without taxes
function computeSubtotal() {
  // calculate total value of items (the prices that user input) and the most recent item that user input
  const committed = state.items.reduce((a, b) => a + b, 0);
  const current = toNumber(state.entry);
  return committed + current;
}

// calculate everything (price of both taxes and the grand total (with taxes))
function computeTotals() {
  // calculate total before taxes
  const subtotal = computeSubtotal();
  // calculate the taxes (if taxes are not enabled, return 0)
  const sst = state.sstEnabled ? subtotal * (toNumber(state.sstRate) / 100) : 0;
  const svc = state.svcEnabled ? subtotal * (toNumber(state.svcRate) / 100) : 0;
  // grand total of everything
  const grand = subtotal + sst + svc;
  // return everything
  return { subtotal, sst, svc, grand };
}

// get every number to 2 decimal places
function fmt(n) {
  return `RM${n.toFixed(2)}`;
}

// the main things the browser has to run
function render() {
  // Inputs
  // current value user is inputting
  $("entry").value = state.entry;
  $("sstToggle").checked = state.sstEnabled;
  $("svcToggle").checked = state.svcEnabled;
  $("sstRate").value = state.sstRate;
  $("svcRate").value = state.svcRate;

  // Collapse controls (determine whether to show the sst / services rates for users to see)
  const sstCollapse = bootstrap.Collapse.getOrCreateInstance($("sstInputs"), {
    toggle: false,
  });
  const svcCollapse = bootstrap.Collapse.getOrCreateInstance($("svcInputs"), {
    toggle: false,
  });
  state.sstEnabled ? sstCollapse.show() : sstCollapse.hide();
  state.svcEnabled ? svcCollapse.show() : svcCollapse.hide();

  // Items list (add item that user keyed in to the list of items in meals)
  const ul = $("itemsList");
  ul.innerHTML = "";
  state.items.forEach((val, idx) => {
    const li = document.createElement("li"); // create <li></li> element
    li.className =
      "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `<span>Item ${idx + 1}</span><span class="amount">${fmt(
      val // input of the user
    )}</span>`;
    ul.appendChild(li);
  });

  // Totals
  const { subtotal, sst, svc, grand } = computeTotals();
  $("subtotal").textContent = fmt(subtotal);
  $("sstAmount").textContent = fmt(sst);
  $("svcAmount").textContent = fmt(svc);
  $("grandTotal").textContent = fmt(grand);

  // Theme (set the theme of the website to state.theme)
  applyTheme(state.theme);

  // Log list
  renderLog();

  // save the state into the "items-in-meal"
  save();
}

// show the logs of ur previous meals in meal log
function renderLog() {
  const wrap = $("log");
  // clear anything inside element with log ID
  wrap.innerHTML = "";
  // if no meals logged
  if (!state.log.length) {
    const empty = document.createElement("div");
    empty.className = "list-group-item text-secondary";
    empty.textContent = "No meals logged yet.";
    wrap.appendChild(empty);
    return;
  }
  // else loop through the logs and sort it by most recently added
  state.log
    .slice()
    .reverse()
    .forEach((m) => {
      const a = document.createElement("a");
      a.href = "#";
      a.className =
        "list-group-item list-group-item-action d-flex justify-content-between align-items-center";
      const left = document.createElement("div");
      left.innerHTML = `<div class="fw-semibold">${m.title}</div><div class="small text-secondary">${m.when}</div>`;
      const right = document.createElement("div");
      right.className = "amount fw-semibold";
      right.textContent = fmt(m.totals.grand);
      a.append(left, right);
      wrap.appendChild(a);
    });
}

// ---------- Actions ----------
// save the current number into the list of items in meals
function commitPlus() {
  const n = toNumber(state.entry);
  if (!Number.isFinite(n) || state.entry === "") {
    return; // ignore if input field empty
  }
  // push the inputted value to state.items
  state.items.push(Number(n.toFixed(2)));
  // clear the input field
  state.entry = "";
  // rerender website
  render();
}

// prevent any errors before putting the inputted value into the input field
function appendChar(ch) {
  // prevent multiple dots
  if (ch === "." && state.entry.includes(".")) {
    return;
  }
  // limit to less than 7 digits (maximum 6 digits)
  if (state.entry.length > 5) {
    return;
  }
  state.entry += ch;
  render();
}

// delete the most previously entered number in the input field
function backspace() {
  state.entry = state.entry.slice(0, -1);
  render();
}

// clear everything in the input field of the calculator
function clearEntry() {
  state.entry = "";
  render();
}

// reset all values to the default value (nothing)
function resetAll() {
  state.entry = "";
  state.items = [];
  state.sstEnabled = false;
  state.sstRate = DEFAULTS.sstRate;
  state.svcEnabled = false;
  state.svcRate = DEFAULTS.svcRate;
  render();
}

// add a new meal in meal-log
function newMeal() {
  // calculate the total of everything (items-in-meal, sst, service tax)
  const totals = computeTotals();
  if (computeSubtotal() === 0) {
    return; // if nothing to save, don't return anything / stop the function here
  }
  // add the time of when u add the meal
  const when = new Date().toLocaleString("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  });
  const title = `Meal #${(state.log?.length || 0) + 1}`;
  // push the title, date, items, settings (tax rates and whether they are enabled or not) and total price into the log
  state.log.push({
    title,
    when,
    items: [...state.items, toNumber(state.entry)].filter((n) => n),
    settings: {
      sstEnabled: state.sstEnabled,
      sstRate: toNumber(state.sstRate),
      svcEnabled: state.svcEnabled,
      svcRate: toNumber(state.svcRate),
    },
    totals,
  });
  // save the meal log into local storage
  saveLog();
  // reset everything to default for next input
  resetAll();
}

// ---------- Event wiring ----------
function wireEvents() {
  // check whether the dark / light mode switch is on (true) or off (false) which trigger dark mode if true and light mode if false
  $("themeToggle").addEventListener("change", (e) => {
    state.theme = e.target.checked ? "dark" : "light";
    render();
  });

  // typing directly into the input
  $("entry").addEventListener("input", (e) => {
    // Keep only digits and one dot
    const cleaned = e.target.value.replace(/[^0-9.]/g, ""); // anything that not a digit or a dot gets removed
    // if more than one dot, keep the first one and squash the rest into digits after it (1..32 -> 1.32)
    // if not, just keep cleaned value
    const parts = cleaned.split(".");
    state.entry =
      parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;
    // rerender everything
    render();
  });

  // add a the digit of the keypad that was clicked into the input field
  document.querySelectorAll(".keypad [data-key]").forEach((btn) => {
    btn.addEventListener("click", () => appendChar(btn.dataset.key));
  });

  // run the commitPlus action add the current number in input field into items-in-meals
  document
    .querySelector('[data-action="plus"]')
    .addEventListener("click", commitPlus);

  // run the backspace action which deletes most previously entered digit in the input field
  document
    .querySelector('[data-action="back"]')
    .addEventListener("click", backspace);

  // run the clearEntry action which clears everything
  document
    .querySelector('[data-action="clear"]')
    .addEventListener("click", clearEntry);

  // Taxes (render again everytime a tax is enabled / a tax's rate is changed)
  $("sstToggle").addEventListener("change", (e) => {
    state.sstEnabled = e.target.checked;
    render();
  });
  $("svcToggle").addEventListener("change", (e) => {
    state.svcEnabled = e.target.checked;
    render();
  });
  $("sstRate").addEventListener("input", (e) => {
    state.sstRate = toNumber(e.target.value) || DEFAULTS.sstRate;
    render();
  });
  $("svcRate").addEventListener("input", (e) => {
    state.svcRate = toNumber(e.target.value) || DEFAULTS.svcRate;
    render();
  });

  // Buttons
  // run resetAll function when resetBtn is clicked
  $("resetBtn").addEventListener("click", resetAll);
  // run newMeal function when newMealBtn is clicked
  $("newMealBtn").addEventListener("click", newMeal);
  // reset the current log in the state and update it in the local storage to delete everything
  // rerender the entire website after that
  $("clearLogBtn").addEventListener("click", () => {
    state.log = [];
    saveLog();
    render();
  });
}

// ---------- Init ----------
// load the meals-in-item data
load();
// load the meal-log data
loadLog();
// run wireEvents
wireEvents();
// set the theme of browser
applyTheme(state.theme);
// render the main logistics of the code
render();
