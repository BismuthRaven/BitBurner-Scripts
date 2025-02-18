// ---------- Global Variables and Helpers ----------
const state = {
    company: "",
    started: false,
    game: {}
};

const speed = 20;
const wnd = window; // no need to use eval()
const doc = wnd.document;
const SERVER_URL = "http://localhost:42069/infiltrate";

// Async delay helper using arrow function.
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Send action helper.
const sendAction = async (action, key = null) => {
    const payload = { action, ...(key && { key }) };
    try {
        await fetch(SERVER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error("Failed to send action:", err);
    }
};

// DOM helpers.
const getEl = (parent, selector) => {
    let prefix = ":scope";
    if (typeof parent === "string") {
        selector = parent;
        parent = doc;
        prefix = ".MuiBox-root>.MuiBox-root>.MuiBox-root";
        if (!doc.querySelectorAll(prefix).length) {
            prefix = ".MuiBox-root>.MuiBox-root>.MuiGrid-root";
        }
        if (!doc.querySelectorAll(prefix).length) {
            prefix = ".MuiContainer-root>.MuiPaper-root";
        }
        if (!doc.querySelectorAll(prefix).length) return [];
    }
    return parent.querySelectorAll(selector.split(",").map(item => `${prefix} ${item}`).join(","));
};

const filterByText = (elements, text) => {
    text = text.toLowerCase();
    for (let el of elements) {
        if (el.textContent.toLowerCase().includes(text)) {
            return el;
        }
    }
    return null;
};

const getLines = (elements) => {
    const lines = [];
    elements.forEach(el => lines.push(el.textContent));
    return lines;
};

// ---------- Infiltration Games Definition ----------
const infiltrationGames = [
    {
        name: "type it backward",
        init: screen => {
            const lines = getLines(getEl(screen, "p"));
            // No reversal applied per current logic - adjust if needed.
            state.game.data = lines[0].split("").join("");
        },
        play: async screen => {
            if (!state.game.data) return;
            await sendAction("play-type-it-backward", state.game.data);
            delete state.game.data;
        }
    },
    {
        name: "type it",
        init: screen => {
            const lines = getLines(getEl(screen, "p"));
            state.game.data = lines[0];
        },
        play: async screen => {
            if (!state.game.data) return;
            await sendAction("play-type-it", state.game.data);
            delete state.game.data;
        }
    },
    {
        name: "enter the code",
        init: screen => {
            console.log("Awaiting game start...");
            state.game.data = [];
            const arrowsText = getEl(screen, "h4")[1].textContent;
            sendAction("log", "Entering code: " + arrowsText);
            const keyMap = { "↑": "w", "↓": "s", "←": "a", "→": "d" };
            for (let char of arrowsText) {
                if (keyMap[char]) state.game.data.push(keyMap[char]);
            }
        },
        play: async screen => {
            if (!state.game.data || !state.game.data.length) { delete state.game.data; return; }
            await sendAction("play-enter-code", state.game.data.shift());
        }
    },
    {
        name: "close the brackets",
        init: screen => {
            const data = getLines(getEl(screen, "p"));
            const text = data.join("").trim();
            const brackets = text.split("");
            let result = "";
            for (let i = brackets.length - 1; i >= 0; i--) {
                const char = brackets[i];
                if (char === "<") result += ">";
                else if (char === "(") result += ")";
                else if (char === "{") result += "}";
                else if (char === "[") result += "]";
            }
            state.game.data = result;
        },
        play: async screen => {
            if (!state.game.data) return;
            await sendAction("play-close-brackets", state.game.data);
            delete state.game.data;
        }
    },
    //{
    //    name: "attack after the guard drops his guard and is distracted",
    //    init: screen => { 
    //        state.game.data = "wait"; 
    //        sendAction("log", "Attacking after guard is distracted.");
//
    //    },
    //    play: async screen => {
    //        //loop all this
    //        while (true) {
    //            const data = getLines(getEl(screen, "h4"));
    //            if (state.game.data === "attack") {
    //                await sendAction("play-attack", " ");
    //                state.game.data = "done";
    //            }
    //            if (state.game.data === "wait" && data.indexOf("Distracted!") !== -1) {
    //                state.game.data = "attack";
    //            }
    //            await delay(50);
    //        }
    //    }
    //},
    {
        name: "say something nice about the guard",
        init: screen => { },
        play: async screen => {
            const correct = [
                "affectionate", "agreeable", "bright", "charming", "creative", "determined",
                "energetic", "friendly", "funny", "generous", "polite", "likable",
                "diplomatic", "helpful", "giving", "kind", "hardworking", "patient",
                "dynamic", "loyal", "straightforward"
            ];
            const word = getLines(getEl(screen, "h5"))[1];
            if (correct.indexOf(word) !== -1) {
                await sendAction("play-say-nice", " ");
            } else {
                await sendAction("play-say-nice", "w");
            }
        }
    },
    {
        name: "remember all the mines",
        init: screen => {
            const rows = getEl(screen, "p");
            let gridSize = null;
            switch (rows.length) {
                case 9: gridSize = [3, 3]; break;
                case 12: gridSize = [3, 4]; break;
                case 16: gridSize = [4, 4]; break;
                case 20: gridSize = [4, 5]; break;
                case 25: gridSize = [5, 5]; break;
                case 30: gridSize = [5, 6]; break;
                case 36: gridSize = [6, 6]; break;
            }
            if (!gridSize) return;
            state.game.data = [];
            let index = 0;
            for (let y = 0; y < gridSize[1]; y++) {
                state.game.data[y] = [];
                for (let x = 0; x < gridSize[0]; x++) {
                    state.game.data[y].push(rows[index].children.length > 0);
                    index++;
                }
            }
        },
        play: screen => { /* No action required automatically. */ }
    },
    {
        name: "mark all the mines",
        init: screen => {
            state.game.x = 0;
            state.game.y = 0;
            state.game.cols = state.game.data[0].length;
            state.game.dir = 1;
        },
        play: async screen => {
            let { data, x, y, cols, dir } = state.game;
            if (data[y][x]) {
                await sendAction("play-mark-mines", " ");
                data[y][x] = false;
            }
            x += dir;
            if (x < 0 || x >= cols) {
                x = Math.max(0, Math.min(cols - 1, x));
                y++;
                dir *= -1;
                await sendAction("play-mark-mines", "s");
            } else {
                await sendAction("play-mark-mines", dir > 0 ? "d" : "a");
            }
            state.game.data = data;
            state.game.x = x;
            state.game.y = y;
            state.game.dir = dir;
        }
    },
    {
        name: "match the symbols",
        init: screen => {
            const data = getLines(getEl(screen, "h5 span"));
            const rows = getLines(getEl(screen, "p"));
            const keypad = [];
            const targets = [];
            let gridSize = null;
            switch (rows.length) {
                case 9: gridSize = [3, 3]; break;
                case 12: gridSize = [3, 4]; break;
                case 16: gridSize = [4, 4]; break;
                case 20: gridSize = [4, 5]; break;
                case 25: gridSize = [5, 5]; break;
                case 30: gridSize = [5, 6]; break;
                case 36: gridSize = [6, 6]; break;
            }
            if (!gridSize) return;
            let index = 0;
            for (let i = 0; i < gridSize[1]; i++) {
                keypad[i] = [];
                for (let j = 0; j < gridSize[0]; j++) {
                    keypad[i].push(rows[index]);
                    index++;
                }
            }
            data.forEach(symbol => {
                const trimmed = symbol.trim();
                for (let row of keypad) {
                    const idx = row.indexOf(trimmed);
                    if (idx !== -1) {
                        targets.push([keypad.indexOf(row), idx]);
                        break;
                    }
                }
            });
            state.game.data = targets;
            state.game.x = 0;
            state.game.y = 0;
        },
        play: async screen => {
            const target = state.game.data[0];
            let { x, y } = state.game;
            if (!target) return;
            const [to_y, to_x] = target;
            if (to_y < y) {
                y--;
                await sendAction("play-match-symbols", "w");
            } else if (to_y > y) {
                y++;
                await sendAction("play-match-symbols", "s");
            } else if (to_x < x) {
                x--;
                await sendAction("play-match-symbols", "a");
            } else if (to_x > x) {
                x++;
                await sendAction("play-match-symbols", "d");
            } else {
                await sendAction("play-match-symbols", " ");
                state.game.data.shift();
            }
            state.game.x = x;
            state.game.y = y;
        }
    },
    {
        name: "cut the wires with the following properties",
        init: screen => {
            const numberHack = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
            const colors = { red: "red", white: "white", blue: "blue", "rgb(255, 193, 7)": "yellow" };
            const wireColor = { red: [], white: [], blue: [], yellow: [] };
            let instructions = [];
            for (let child of screen.children) instructions.push(child);
            const wiresData = instructions.pop();
            instructions.shift();
            instructions = getLines(instructions);
            const samples = getEl(wiresData, "p");
            const wires = [];
            let wireCount = 0;
            for (let i = 0; i < samples.length; i++) {
                if (numberHack.includes(samples[i].innerText)) wireCount++;
                else break;
            }
            let index = 0;
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < wireCount; j++) {
                    const node = samples[index];
                    const color = colors[node.style.color];
                    if (!color) { index++; continue; }
                    wireColor[color].push(j + 1);
                    index++;
                }
            }
            instructions.forEach(line => {
                const trimmed = line.trim().toLowerCase();
                if (!trimmed || trimmed.length < 10) return;
                if (trimmed.indexOf("cut wires number") !== -1) {
                    const parts = trimmed.split(/(number\s*|\.)/);
                    wires.push(parseInt(parts[2]));
                }
                if (trimmed.indexOf("cut all wires colored") !== -1) {
                    const parts = trimmed.split(/(colored\s*|\.)/);
                    const clr = parts[2];
                    if (!wireColor[clr]) return;
                    wireColor[clr].forEach(num => wires.push(num));
                }
            });
            state.game.data = [...new Set(wires)];
        },
        play: async screen => {
            const wire = state.game.data;
            if (!wire) return;
            for (let num of wire) {
                await sendAction("play-cut-wires", num.toString());
            }
        }
    },
    {
        name: "distracted",
        init: screen => {
            state.game.data = "do-one-attack";
            console.log("Guard state 'distracted' detected.");
        },
        play: async screen => {
            if (state.game.data === "do-one-attack") {
                state.game.data = "done";
            }
            await sendAction("play-attack", " ");
        }
    }
];

// ---------- Infiltration Control Loop ----------
const infLoop = async () => {
    if (!state.started) waitForStart();
    else await playGame();
};

const playGame = async () => {
    const screens = doc.querySelectorAll(".MuiContainer-root");
    if(!screens.length) return;
    if (screens[0].children.length < 3) return;
    const screen = screens[0].children[2];
    const h4 = getEl(screen, "h4");
    if (!h4.length) return;
    const title = h4[0].textContent.trim().toLowerCase().split(/[!.(]/)[0];
    if (title === "get ready") return;
    const game = infiltrationGames.find(g => g.name === title);
    if (game) {
        if (state.game.current !== title) {
            state.game.current = title;
            game.init(screen);
        }
        await game.play(screen);
    } else {
        console.error("Unknown game:", title);
    }
};

const waitForStart = () => {
    const h4 = getEl("h4");
    if (!h4.length) return;
    const title = h4[0].textContent;
    if (!title.startsWith("Infiltrating")) return;
    const btnStart = filterByText(getEl("button"), "Start");
    if (!btnStart) return;
    state.company = title.substring(13);
    state.started = true;
    console.log("Starting infiltration for", state.company);
    sendAction("start");
};

// ---------- Main Function ----------
export async function main(ns) {
    ns.tprint("\nAutomated infiltration enabled – monitoring active.\n");
    while (true) {
        await infLoop();
        await delay(speed);
    }
}
