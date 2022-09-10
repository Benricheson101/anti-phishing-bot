## About Fish 🐟

Fish 🐟 is a bot made to protect your server against phishing links.  
Want to contribute and add a feature? Create a pull request :)  
Fish Bot uses slash commands for all of it interactions.  


| [🤖 Add bot to server](https://discord.com/oauth2/authorize?client_id=892420397570592768&scope=bot%20applications.commands&permissions=268446726) |
| --- |



## Quick Setup

An example of how you can set up the bot on your server.  
`/config set delete:True` to enable deletion of phishing links  
`/config set action:Kick` to kick the user from your server  
`/config set notify:True` to notify the user that sent the phishing links in direct message about the action (kick)  
`/config set log_channel:#logs` to send logs of who got caught for phishing into `#logs`  
`/config set abusive_user_action:Ban` to ban members with known names and profile pictures of phishing accounts. Use `/check_members` to scan manually and take action


**View Current Configuration**  
Check your config with the command `/config get`  

**Want to see more stats on the bot?**  
Use `/stats` to get a list of the top 10 domains of the last 24h that Fish saw.  
Want more statistics? Check out https://fish.wah.wtf/d/owo/fish  

**Need Help?**  
Use `/support` and join the [support server](https://discord.gg/yn9fXGAW8Q) and ask in `#support` for help.


## Commands

### Information
`/ping` - See if the bot is receiving commands<br>
`/stats` - View the current stats for total domains, total hits, or the top ten domain name<br>
`/lookup` - Check if a domain is registered as a known phishing domain<br>
`/support` - Get the bot [support server](https://discord.gg/yn9fXGAW8Q) link<br>
`/check_members` - Scans the entire server for possible phishing direct message bots. Use `/config set abusive_user_action:Ban` to automate this

### Configuration<br>
`/config get` - View your current configuration<br>
`/config set <option> <setting>` - Set a configuration setting<br>
`/config reset <option>` - Reset a configuration setting<br>
`/config exemptions list <filter>` - View exemptions list<br>
`/config exemptions create (role | user) <target>` - Create a new exemptions<br>
`/config exemptions remove (role | user) <target>` - Remove a exemptions from the list<br>
