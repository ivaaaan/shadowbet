"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "zkbet.emojiSalt";

const EMOJIS =
    "😀😁😂🤣😃😄😅😆😉😊😋😎😍😘🥰😗😙😚🙂🤗🤩🤔🤨😐😑😶🙄😏😣😥😮🤐😯😪😫🥱😴😌😛😜🤪😝🤤😒😓😔😕🙃🫠🤑😲☹️🙁😖😞😟😤😢😭😦😧😨😩🤯😬😮‍💨😰😱🥵🥶😳🤪🤕🤒🤧🥴😵‍💫😵🤠🥳".split(
        ""
    );

function generateEmojiSalt(length = 6): string {
    const parts: string[] = [];
    const cryptoObj = typeof window !== "undefined" ? window.crypto : undefined;
    for (let i = 0; i < length; i += 1) {
        let idx = Math.floor(Math.random() * EMOJIS.length);
        if (cryptoObj?.getRandomValues) {
            const arr = new Uint32Array(1);
            cryptoObj.getRandomValues(arr);
            idx = arr[0] % EMOJIS.length;
        }
        parts.push(EMOJIS[idx]);
    }
    return parts.join("");
}

export function useEmojiSalt() {
    const [salt, setSalt] = useState<string | null>(null);

    useEffect(() => {
        const existing = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        if (existing) {
            setSalt(existing);
        } else {
            const created = generateEmojiSalt();
            setSalt(created);
            if (typeof window !== "undefined") {
                localStorage.setItem(STORAGE_KEY, created);
            }
        }
    }, []);

    const exportSalt = useCallback(() => {
        if (!salt) return;
        const blob = new Blob([salt], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "zkbet-salt.txt";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }, [salt]);

    const ensureSalt = useCallback(() => {
        if (!salt) {
            const created = generateEmojiSalt();
            setSalt(created);
            if (typeof window !== "undefined") {
                localStorage.setItem(STORAGE_KEY, created);
            }
            return created;
        }
        return salt;
    }, [salt]);

    return useMemo(
        () => ({ salt, exportSalt, ensureSalt }),
        [salt, exportSalt, ensureSalt]
    );
}


