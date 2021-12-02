<h1 align="center">Contributing to Fish 🐟</h1>

## Guidelines:
When contributing, please follow these guidelines:

- Thoroughly test all changes locally before you make a pull request, no matter how minor your change is.
- Run `lint` and `fmt` scripts and resolve any errors before committing code.
- For the sake of consistency, please use [Yarn](https://yarnpkg.com) instead of [NPM](https://npmjs.org)
- Before making any major changes to the functionality of the bot (breaking changes to commands, new commands, removing commands, etc.), please contact me via Discord ([`Ben!#0002`](https://discord.com/users/255834596766253057)) or join my [Discord server](https://pupy.gay/d).

If you have any questions or need any help, feel free to send me a message on Discord ([`Ben!#0002`](https://discord.com/users/255834596766253057)) or join my [Discord server](https://pupy.gay/d)

## How to Contribute:

1. Fork and clone this repository
> ```bash
> $ git clone git@github.com:{GITHUB_USERNAME}/anti-phishing-bot.git
> ```
2. Create a branch for your changes
> ```bash
> $ git checkout -b {BRANCH_NAME}
> ```
3. Make changes
4. Lint and format the code
> ```bash
> $ yarn lint
> $ yarn fmt
> ```
5. Commit changes. Please use descriptive commit messages that make it clear what was changed
> ```bash
> $ git add .
> $ git commit
> ```
6. Push changes to your fork
> ```
> $ git push -u origin {BRANCH_NAME}
> ```
7. Open a pull request into the `main` branch
