#!/usr/bin/env node

import {env} from 'node:process'

let output_channel_id = '1139364504594042940'
let relays = [
    {
        name: 'mk',
        channel_id: '849455257472991243', // stocks-only-chat
        keywords: ['sean', '966755728297709579'], // g
        excludes: ['1070055942110060704'], // sean
    },
    {
        name: 'mk',
        channel_id: '1013467791640252426', // live-noob-trading
        keywords: ['966755728297709579'], // g
        excludes: [],
    },
    {
        name: 'ttt',
        channel_id: '1066547447909859339', // main-chat
        keywords: ['531333398711762944'], // coinfox
        excludes: ['tr-'],
    },
    {
        name: 'ts',
        channel_id: '1039199140325896283', // topstep-chinese
        keywords: ['729348670721622026', '788937987311534090'], // edward
        excludes: [],
        translate: true,
    },
]

if (!env.auth) throw new Error('auth')

let last_message_ids = []

while (true) {
    for (let relay of relays) {
        let messages_url = `https://discord.com/api/v9/channels/${relay.channel_id}/messages?limit=100`
        if (last_message_ids[relay.channel_id]) messages_url += `&after=${last_message_ids[relay.channel_id]}`

        let messages_response = await fetch(messages_url, {headers: {'authorization': env.auth}})
        let messages_json = await messages_response.json()

        if (!messages_json.length) continue
        if (!last_message_ids[relay.channel_id]) last_message_ids[relay.channel_id] = messages_json[0].id

        for (let i = messages_json.length - 1; i >= 0; i--) {
            let message = messages_json[i]

            if (message.id <= last_message_ids[relay.channel_id]) continue
            last_message_ids[relay.channel_id] = message.id

            if (!message.content) continue

            let filter = true
            let message_field_contents = [
                message.content,
                message.author.id,
                message.author.username,
                message.author.global_name,
            ]
            for (let message_field_content of message_field_contents) {
                if (!message_field_content) continue
                let haystack = message_field_content.toLowerCase()
                for (let keyword of relay.keywords) {
                    let needle = keyword.toLowerCase()
                    if (haystack.includes(needle))
                        filter = false
                }
            }
            for (let message_field_content of message_field_contents) {
                if (!message_field_content) continue
                let haystack = message_field_content.toLowerCase()
                for (let exclude of relay.excludes) {
                    let needle = exclude.toLowerCase()
                    if (haystack.includes(needle))
                        filter = true
                }
            }

            if (filter) continue

            let content_translated
            if (relay.translate) {
                let translate_response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${message.content}`)
                let translate_json = await translate_response.json()

                content_translated = translate_json[0][0][0]
            }

            let author = message.author.global_name ?? message.author.username
            let content = content_translated ?? message.content
            let output = `\`[${relay.name}:${author}] ${content}\``

            console.info(output)

            let submit_response = await fetch(`https://discord.com/api/v9/channels/${output_channel_id}/messages`, {
                headers: {'authorization': env.auth, 'content-type': 'application/json'},
                method: 'POST',
                body: JSON.stringify({content: output}),
            })
            let submit_json = submit_response.json()
        }
    }

    await new Promise (function (resolve) { setTimeout(resolve, 60_000) })
}
