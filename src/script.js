import TelegramBot from 'node-telegram-bot-api'
import config from 'config'
import { connection } from './db/connection.mjs'
import { Request } from './db/replenishmentModel.mjs'

const bot = new TelegramBot(config.get('TELEGRAM_TOKEN'), { polling: true })

connection
  .then(() => {
    console.log('Database connection successful')
  })
  .catch((err) => {
    console.log(`Server not running. Error message: ${err.message}`)
    process.exit(1)
  })

bot.on('message', async (msg) => {
  const { text, from, chat } = msg
  const regexPattern = new RegExp(chat.id + '$', 'i');
  const request = await Request.findOne({ state: { $regex: regexPattern } })

  // if (chat.id === 1228886912) {
  //   const userReplenishments = await Replenishment.aggregate([
  //     {
  //       $group: {
  //         _id: '$worker',
  //         replenishmentsCount: { $sum: 1 },
  //         summ: { $sum: '$amount' }
  //       }
  //     }
  //   ]).sort({ summ: -1 })

  // }


  if (request) {
    if (request.state.startsWith('from')) {
      await Request.findOneAndUpdate({ _id: request._id }, { state: `experience-${chat.id}`, from: text })

      return bot.sendMessage(chat.id, `2️⃣ Отлично, а был ли у тебя опыт в скаме? Если да то по каким направлениям?`, {
        reply_markup: {
          remove_keyboard: true
        }
      })

    }

    if (request.state.startsWith('experience')) {
      await Request.findOneAndUpdate({ _id: request._id }, { state: `time-${chat.id}`, experience: text })

      return bot.sendMessage(chat.id, `3️⃣ А сколько времени ты готов уделять работе в нашем проекте?`)
    }

    if (request.state.startsWith('time')) {
      await Request.findOneAndUpdate({ _id: request._id }, { state: `goals-${chat.id}`, time: text })

      return bot.sendMessage(chat.id, `4️⃣ И на последок, какие цели ты преследуешь, на что хочешь заработать?`)
    }

    if (request.state.startsWith('goals')) {

      const req = await Request.findOneAndUpdate({ _id: request._id }, { state: `waiting-${chat.id}`, goals: text })

      bot.sendMessage(6575814393, `Заявка от @${from.username}:\nОткуда узнал о нашем проекте: ${req.from}\nОпыт в скаме: ${req.experience}\nВремя: ${req.time}\nЦели: ${text}`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '✅ Принять',
                callback_data: `accept-${chat.id}`,
              },
              {
                text: '❌ Отклонить',
                callback_data: `decline-${chat.id}`,
              }
            ]
          ]
        }

      })
      bot.sendMessage(1228886912, `Заявка от @${from.username}:\nОткуда узнал о нашем проекте: ${req.from}\nОпыт в скаме: ${req.experience}\nВремя: ${req.time}\nЦели: ${text}`)

      return bot.sendMessage(chat.id, `⏳ Отлично, твоя заявка отправлена на проверку ТСам проекта

Подожди немного, бот отправит тебе сообщение после их решения, обычно мы рассматриваем заявки в течении 10 минут`)

    }

    if (request.state.startsWith('waiting')) {

      return bot.sendMessage(chat.id, `⏳ Твоя заявка проверяется ТСами проекта, подожди немного`)
    }
  }

  if (text === '✅ Согласен') {
    if (!chat.username) {
      return bot.sendMessage(chat.id, `Для подачи завки, укажи свою личную ссылку в Telegram: @username`)
    }

    await Request.create({
      state: `from-${chat.id}`,
    })

    return bot.sendMessage(chat.id, `1️⃣ Первым укажи откуда ты узнал о нашем проекте?`, {
      reply_markup: {
        keyboard: [
          [
            {
              text: 'Реклама',
            },
            {
              text: 'Другие воркеры',
            }
          ]
        ]
      },
    })
  }

  if (text.startsWith('/start')) {
    return requestMenu(chat.id)
  }

  return requestMenu(chat.id)
})

bot.on('callback_query', async (query) => {
  const { data, message } = query
  const { chat } = message

  if (data.startsWith('accept')) {
    const id = data.split('-')[1]
    const regexPattern = new RegExp(id + '$', 'i');
    await Request.findOneAndDelete({ state: { $regex: regexPattern } })
    bot.deleteMessage(chat.id, query.message.message_id)

    return bot.sendMessage(id, `✅ Ваша заявка принята ТСами проекта\nСсылка на группу нашей команды: https://t.me/+SMB7mi1CoCFlZjc6`)
  }

  if (data.startsWith('decline')) {
    const id = data.split('-')[1]
    const regexPattern = new RegExp(id + '$', 'i');
    await Request.findOneAndDelete({ state: { $regex: regexPattern } })
    bot.deleteMessage(chat.id, query.message.message_id)
    return bot.sendMessage(id, `❌ Твоя заявка была отклонена ТСом, попробуй подать ее еще раз`, {
      reply_markup: {
        keyboard: [
          [
            {
              text: '➕ Подать заявку',
            }
          ]
        ],
      }
    })
  }
})




function requestMenu(chatId) {

  bot.sendMessage(chatId, `👋 Привет, перед началом работы заполни небольшую анкету и ознакомься с правилами проекта:

— Запрещена любая реклама, флуд, спам, коммерция, продажа услуг в чате воркеров
— Запрещено оскорблять воркеров, разводить срач, вести себя неадекватно
— Запрещено попрошайничество в любом его виде
— Запрещено отправлять мамонтам свои реквизиты
— Запрещено принимать оплату на свои реквизиты
— Запрещено отправлять мамонтам свои тех.поддержки
— Запрещен скам или попытки скама воркеров в любом его виде
— Заблокированные пользователи не получают выплаты
— ТСы проекта не несут ответственности за блокировку кошельков
— ТСы проекта не несут ответственности за проблемы выплат со стороны платежных систем
— ТСы проекта имеют право не принимать в команду воркера без объяснения причин

✅ Если ты согласен с правилами проекта, нажми на кнопку ниже`, {
    reply_markup: {
      keyboard: [
        [
          {
            text: '✅ Согласен',
            callback_data: 'accept',
          }
        ]
      ]
    },
  })
}
