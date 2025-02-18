const express = require('express');
const robot = require('robotjs'); // OS-level keyboard automation
const app = express();
const PORT = 42069; // Port number

app.use(express.json());

// Add delay helper
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Define shift mapping for special keys.
const shiftMapping = {
  ">": { base: ".", modifiers: ["shift"] },
  ")": { base: "0", modifiers: ["shift"] },
  "}": { base: "]", modifiers: ["shift"] },
  "(": { base: "9", modifiers: ["shift"] },
  "{": { base: "[", modifiers: ["shift"] },
};

// Helper: Simulate a key press with a short delay
async function pressKey(key, delayMs = 0) {
  // Check if the key needs a shift-combo.
  if (shiftMapping[key]) {
    const { base, modifiers } = shiftMapping[key];
    console.log(`Simulating key press: ${modifiers}+${base}`);
    robot.keyTap(base, modifiers);
  } else {
    console.log(`Simulating key press: ${key}`);
    robot.keyTap(key);
  }
  if (delayMs > 0)
    await delay(delayMs);
}

// Receive requests from the infiltration client.
app.post('/infiltrate', async (req, res) => {
  const action = req.body.action;
  if (!action) {
    return res.status(400).send({ error: "Missing 'action' parameter." });
  }
  try {
    console.log("Received action:", action, "with payload:", req.body);
    
    if (action === 'start') {
      // For a "start" action, simulate keypresses to activate the infiltration screen.
      // Adjust the key(s) as needed to mimic starting infiltration.
      await pressKey("tab"); 
      await pressKey("enter");
      console.log("Sent start command.");
    } else if (action === 'play' || action.startsWith("play-")) {
      // If a key is provided, simulate that keypress.
      if (req.body.key) {
        const keys = req.body.key.toLowerCase();
        // If more than one character, iterate over and press each key.
        if (keys.length > 1) {
          for (let char of keys) {
            await pressKey(char);
          }
        } else {
          await pressKey(keys);
        }
      } else {
        // Fallback default key press.
        await pressKey("~");
      }
    } else if (action === 'stop') {
      console.log("Stop action received. (No stop action implemented)");
      // Optionally, implement additional logic.
    } else if (action === 'log'){
      console.log("Log action received. (No log action implemented)");
      // Optionally, implement additional logic.
    } else {
      console.log("Unknown action:", action);
      return res.status(400).send({ error: "Unknown action." });
    }
    res.send({ status: "Action executed", action });
  } catch (err) {
    console.error("Error processing action:", err);
    res.status(500).send({ error: err.toString() });
  }
});

// A simple status endpoint.
app.get('/status', (req, res) => {
  res.send({ status: "Server is running." });
});

app.listen(PORT, () => {
  console.log(`Infiltration server listening on port ${PORT}`);
});
