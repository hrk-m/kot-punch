import streamDeck from "@elgato/streamdeck";

import { IncrementCounter } from "./actions/increment-counter";

// Keep logs at info by default to avoid verbose payload logging in normal usage.
streamDeck.logger.setLevel("info");

// Register the increment action.
streamDeck.actions.registerAction(new IncrementCounter());

// Finally, connect to the Stream Deck.
streamDeck.connect();
