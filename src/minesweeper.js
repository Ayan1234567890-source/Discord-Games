const Discord = require('discord.js');

const WIDTH = 9;
const HEIGHT = 8;
const gameBoard = [];
const bombLocs = [];

const charMap = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];

module.exports = class MinesweeperGame {
    constructor() {
        this.gameEmbed = null;
        this.inGame = false;
    }

    getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }

    gameBoardToString(links = true) {
        let str = ""
        for (let y = 0; y < HEIGHT; y++) {
            for (let x = 0; x < WIDTH; x++) {
                const index = y * WIDTH + x;
                if (gameBoard[index] === "⬜" || gameBoard[index] === "🚩") {
                    if (links)
                        str += "[" + gameBoard[index] + "](http://theturkey.dev/" + charMap[x] + charMap[y] + (x == 2 && y == 2 ? "2" : "") + ")";
                    else
                        str += gameBoard[index];
                } else {
                    str += gameBoard[index];
                }
            }
            str += "\n";
        }
        return str;
    }

    newGame(msg, onGameEnd) {
        if (this.inGame)
            return;

        this.gameStarter = msg.author.id;
        this.onGameEnd = onGameEnd;

        for (let y = 0; y < HEIGHT; y++) {
            for (let x = 0; x < WIDTH; x++) {
                gameBoard[y * WIDTH + x] = "⬜";
                bombLocs[y * WIDTH + x] = false;
            }
        }

        for (let i = 0; i < 7; i++) {
            const x = this.getRandomInt(WIDTH);
            const y = this.getRandomInt(HEIGHT);

            const index = y * WIDTH + x;

            if (!bombLocs[index])
                bombLocs[index] = true;
            else
                i--;
        }

        this.flagging = false;
        this.inGame = true;
        msg.channel.send(this.getEmbed()).then(emsg => {
            this.gameEmbed = emsg;
            this.gameEmbed.react('👆');
            this.gameEmbed.react('🚩');
            this.waitForReaction();
        });
    }

    getEmbed() {
        return new Discord.MessageEmbed()
            .setColor('#c7c7c7')
            .setTitle('Minesweeper')
            .setAuthor("Made By: TurkeyDev", "https://site.theturkey.dev/images/turkey_avatar.png", "https://twitter.com/turkeydev")
            .setDescription(this.gameBoardToString())
            .addField(this.flagging ? 'Flagging' : 'Clicking', this.flagging ? '🚩' : '👆', false)
            .addField('How To Play:', 'Click on a square above and visit the url to reveal, or flag the tile!', false)
            .setFooter(`Currently Playing: ${this.gameStarter.username}`)
            .setTimestamp();
    }

    step() {
        let lose = false;
        let win = true;
        for (let y = 0; y < HEIGHT; y++) {
            for (let x = 0; x < WIDTH; x++) {
                const index = y * WIDTH + x;
                if (gameBoard[index] === "⬜" && !bombLocs[index])
                    win = false;
                if (gameBoard[index] === "💣")
                    lose = true;
                if (gameBoard[index] === "🚩" && !bombLocs[index])
                    win = false;
            }
        }

        if (win || lose)
            this.gameOver({ result: 'winner', win: win });
        else
            this.gameEmbed.edit(this.getEmbed());
    }

    gameOver(result) {
        if (result.result !== 'force_end')
            this.onGameEnd();

        if (!result.win) {
            for (let y = 0; y < HEIGHT; y++) {
                for (let x = 0; x < WIDTH; x++) {
                    if (bombLocs[y * WIDTH + x])
                        gameBoard[y * WIDTH + x] = "💣";
                }
            }
        }

        this.inGame = false;
        const endText = result.result === 'winner' && result.win ? "YOU WON" : "YOU LOST";
        const editEmbed = new Discord.MessageEmbed()
            .setColor('#c7c7c7')
            .setTitle('Minesweeper')
            .setAuthor("Made By: TurkeyDev", "https://site.theturkey.dev/images/turkey_avatar.png", "https://twitter.com/turkeydev")
            .setDescription(`**GAME OVER!**\n${endText}\n\n${this.gameBoardToString(false)}`)
            .setTimestamp();
        this.gameEmbed.edit(editEmbed);
        this.gameEmbed.reactions.removeAll()
    }

    filter(reaction, user) {
        return ['👆', '🚩'].includes(reaction.emoji.name) && user.id === this.gameStarter.id;
    }

    waitForReaction() {
        this.gameEmbed.awaitReactions((reaction, user) => this.filter(reaction, user), { max: 1, time: 120000, errors: ['time'] })
            .then(collected => {
                const reaction = collected.first();

                if (reaction.emoji.name === '👆') {
                    this.flagging = false;
                }
                else if (reaction.emoji.name === '🚩') {
                    this.flagging = true;
                }

                this.step();
                reaction.users.remove(reaction.users.cache.filter(user => user.id !== this.gameEmbed.author.id).first().id).then(() => {
                    this.waitForReaction();
                });
            })
            .catch(collected => {
                this.gameOver({ result: 'ended' });
            });
    }

    uncover(col, row) {
        const index = row * WIDTH + col;
        if (bombLocs[index]) {
            gameBoard[index] = "💣";
        }
        else {
            let bombsArround = 0;
            for (let y = -1; y < 2; y++) {
                for (let x = -1; x < 2; x++) {
                    if (col + x < 0 || col + x >= WIDTH || row + y < 0 || row + y >= HEIGHT)
                        continue;
                    if (x === 0 && y === 0)
                        continue;
                    const i2 = (row + y) * WIDTH + (col + x);
                    if (bombLocs[i2])
                        bombsArround++;
                }
            }
            if (bombsArround == 0) {
                gameBoard[index] = "⬛";
                for (let y = -1; y < 2; y++) {
                    for (let x = -1; x < 2; x++) {
                        if (col + x < 0 || col + x >= WIDTH || row + y < 0 || row + y >= HEIGHT)
                            continue;
                        if (x === 0 && y === 0)
                            continue;
                        const i2 = (row + y) * WIDTH + (col + x);
                        if (gameBoard[i2] === "⬜")
                            this.uncover(col + x, row + y);
                    }
                }
            }
            else if (bombsArround == 1) {
                gameBoard[index] = "1️⃣";
            }
            else if (bombsArround == 2) {
                gameBoard[index] = "2️⃣";
            }
            else if (bombsArround == 3) {
                gameBoard[index] = "3️⃣";
            }
            else if (bombsArround == 4) {
                gameBoard[index] = "4️⃣";
            }
            else if (bombsArround == 5) {
                gameBoard[index] = "5️⃣";
            }
            else if (bombsArround == 6) {
                gameBoard[index] = "6️⃣";
            }
            else if (bombsArround == 7) {
                gameBoard[index] = "7️⃣";
            }
            else if (bombsArround == 8) {
                gameBoard[index] = "8️⃣";
            }
        }
    }

    makeMove(col, row) {
        const index = row * WIDTH + col;
        if (gameBoard[index] === "⬜") {
            if (this.flagging) {
                gameBoard[index] = "🚩";
            }
            else {
                this.uncover(col, row);
            }

            this.step();
        }
        else if (gameBoard[index] === "🚩" && this.flagging) {
            gameBoard[index] = "⬜";
        }
    }
}