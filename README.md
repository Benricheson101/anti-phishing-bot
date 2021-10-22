## Fish ##

https://discord.com/oauth2/authorize?client_id=892420397570592768&scope=bot%20applications.commands&permissions=268446726

-------------------
## Configuration ##
### Notify ###
Whether or not to notify offenders via DM.

Setting | Description
--------|--------------
Always | Send a notification regardless of whether or not an action is taken, including exempt members and roles to let the offender know they sent a known anti-phishing link. *ignores links sent in exempt channels*.
Yes | Send a notification in the offender's DM unless they are exempt.
No | Do not notify the offender.

### Delete ###
Whether or not to delete an offending message.

Setting | Description
--------|--------------
Always | Delete the message even if the offender is exempt from further action via a role or member exemption. *ignores links sent in exempt channels*.
Yes | Delete the message unless the member is exempt via a role or member exemption, or the channel is exempt.
No | Does not delete the message.

### Action ###
Principle action to take, unless the member is exempt via a role or member 
exemption, or the channel is exempt.

Setting | Description
--------|--------------
Ban | Bans the offener.
SoftBan | Bans the offender, tnen quickly unbans them.
Kick | Kicks the member.
StickyMute | Mutes the member, persists the mute if the member leaves and rejoins.
Mute | Mutes the member. Does not persist if the member leaves and rejoins.
None | Do nothing, does not effect delete and notify options.

### Log Level ###
Whether or not to log offenenses to a logging channel.

Setting | Description
--------|--------------
Always | Log messages even if no action is taken and the member is exempt via a role or member exemption. *ignores links sent in exempt channels*.
Yes | Log messages unless the member is exempt via role or member exemption. *ignores links sent in exempt channels*
No | Do not log messages

### Log Channel ###
Channel to send log messages to.

### Mute Role ###
Role to add to members whe  muting.

---------------
## Commands: ##
### Ping ###
Pings the bot to determine if it is receiving commands.
`/ping`

### Stats ###
Shows the current stats for: total domains, total hits, and the top ten domain
names.
`/stats`

### Lookup ###
Looksup a domain name to see if it is a known phishing domain.
`/lookup <domain>`

### Config ###
View, change, or reset you guild's anti-phishing configuration.

#### Get ####
View your guild's configuration.
`/config get`

#### Set ####
Set your guild's configuration.
`/config set <option> <setting>`

#### Reset ####
Reset your guild's configuration.

#### Exemptions ####
View, change, or remove your guild's exemptions.

##### List #####
View your guild's exemptions.
`/config exemptions list (channel|role|user)`

##### Create #####
Add an exemption to the guild's configuration.
`/config exemptions create [channel|role|user] <target>`

##### Remove #####
Remove an exemption from the guild's configuration.
`/config exemptions remove [channel|role|user] <target>`

### Clear Mute ####
Clears a previously muted member.
`/clearmute <target>`
