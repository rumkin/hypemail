# Hypemail

Hypemail is an example of email processing automation with nodejs. It receives
email, parse it and send via websocket as a JSON.

## Example

Parsed email looks like that:

```json
{
    "html": "<div>Hi this is a test message. Notify me if you get it</div>\n",
    "headers": {
        "received": [
            "from mxback5g.mail.yandex.net (mxback5g.mail.yandex.net [77.88.29.166]) by forward17p.cmail.yandex.net (Yandex) with ESMTP id 372CD212FE for <c28ec25d@hm.rumk.in>; Sat,  5 Nov 2016 06:22:23 +0300 (MSK)",
            "from web20g.yandex.ru (web20g.yandex.ru [95.108.253.229]) by mxback5g.mail.yandex.net (nwsmtp/Yandex) with ESMTP id j2CjR0Q3Ek-MN2SfLo3; Sat, 05 Nov 2016 06:22:23 +0300",
            "by web20g.yandex.ru with HTTP; Sat, 05 Nov 2016 06:22:23 +0300"
        ],
        "from": "Some User <user@host>",
        "to": "c28ec25d@hm.rumk.in",
        "subject": "asdasd a",
        "mime-version": "1.0",
        "message-id": "<7119991478316143@web20g.yandex.ru>",
        "x-mailer": "Yamail [ http://yandex.ru ] 5.0",
        "date": "Sat, 05 Nov 2016 06:22:23 +0300",
        "content-transfer-encoding": "7bit",
        "content-type": "text/html"
    },
    "subject": "Test message",
    "messageId": "7119991478316143@web20g.yandex.ru",
    "priority": "normal",
    "from": [
        {
            "address": "user@host",
            "name": "Some User"
        }
    ],
    "to": [
        {
            "address": "c28ec25d@hm.rumk.in",
            "name": ""
        }
    ],
    "date": "2016-11-05T03:22:23.000Z",
    "receivedDate": "2016-11-05T03:22:23.000Z"
}
```
