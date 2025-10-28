const messages: { [key: string]: { [lang: string]: string } } = {
    "NAME_NOT_EMPTY" : {
        "en": "Name cannot be empty.",
        "ja": "名前は空にできません。",
    },
    "NAME_TOO_LONG": {
        "en": "Name cannot be longer than %1 characters",
        "ja": "名前は%1文字を超えることはできません"
    },
    "INVALID_FORMAT": {
        "en": "Time is not in a valid format; Try sticking to '00:00.000' 🐸",
        "ja": "時間の形式が無効です。'00:00.000'の形式を試してください 🐸"
    },
    "FIELD_NOT_FOUND": {
        "en": "The provided %1 could not be found ☹️",
        "ja": "指定された%1が見つかりませんでした ☹️"
    },
    "SPLIT_INVALID_FORMAT_OR_TOO_SLOW": {
        "en": "'%1' either had invalid format or was slower than your splits in your pb.",
        "ja": "'%1'は無効な形式であるか、PBのスプリットよりも遅かったです。"
    },
    "INFO_LOGS_COPIED": {
        "en": "Logs copied to clipboard!",
        "ja": "ログがクリップボードにコピーされました！"
    },
}

export function getMessageByKey(key: string, lang: string, ...args: string[]): string {
    let message = messages[key]?.[lang] || messages[key]?.["en"] || "Unknown error.";
    args.forEach((arg, index) => {
        message = message.replace(`%${index + 1}`, arg);
    });
    return message;
}