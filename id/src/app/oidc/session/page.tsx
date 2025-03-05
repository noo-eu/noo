"use client";

import { useEffect } from "react";

async function sha256(plain: string) {
  // returns promise ArrayBuffer
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const buf = await window.crypto.subtle.digest("SHA-256", data);

  const hashArray = Array.from(new Uint8Array(buf));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

function receiveMessage(e: MessageEvent) {
  // e.data has client_id and session_state
  var client_id = e.data.substr(0, e.data.lastIndexOf(" "));
  var session_state = e.data.substr(e.data.lastIndexOf(" ") + 1);
  var salt = session_state.split(".")[1];

  // if message is syntactically invalid
  //     postMessage('error', e.origin) and return

  // if message comes an unexpected origin
  //     postMessage('error', e.origin) and return

  // get_op_user_agent_state() is an OP defined function
  // that returns the User Agent's login status at the OP.
  // How it is done is entirely up to the OP.
  var opuas = get_op_user_agent_state();

  // Here, the session_state is calculated in this particular way,
  // but it is entirely up to the OP how to do it under the
  // requirements defined in this specification.
  var ss =
    sha256(client_id + " " + e.origin + " " + opuas + " " + salt) + "." + salt;

  var stat = "";
  if (session_state === ss) {
    stat = "unchanged";
  } else {
    stat = "changed";
  }

  e.source?.postMessage(stat, { targetOrigin: e.origin });
}

export default function SessionIframe() {
  useEffect(() => {
    window.addEventListener("message", receiveMessage, false);

    return () => {
      window.removeEventListener("message", receiveMessage);
    };
  });

  return <span></span>;
}
