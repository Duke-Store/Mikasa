- when a client "user - member" create a buy ticket the  bot send a message "What You Need" with a Selector "Developer - Service " 
- If a Service the bot will mention the admins role and tell him to wait "admins role id (1502962542740377672)"
- If a Developer The Bot will ask him a few questions for the Project
questions :
`Game Type:  `
`Payment method :  
`Project Time :  
`The Details of the project :  `
`The number of the developers needed :  `
`The roles needed :  `
`Videos and images to explain more :  `
`Do you Agree on the Terms :`
- When the bot reach `The roles needed:` question the bot will send a selector "with multi select option" that have these roles 
`Scripter
`Builder`
`Modeler `
`Fvx`
`Sfx`
`Animator`
`Graphique designer`
`Ui designer`
`Manager`
`Marketing team`
- for the terms question ,the bot will send a message "Do You Agree To Our Terms?" with a button "Terms" that shows the terms
"
## Payment Split

### Client from the Server

-   Developer: **60%**
    
-   Server: **40%**
    

### Client from the Developer

-   Developer: **90%**
    
-   Server: **10%**
    

## Multiple Developers

-   If more than one developer works on a project, the developer's share
    

    is divided equally unless an admin decides otherwise.

-   The server's percentage does not change.
    

## Minimum Part For Single Developer

-   Large projects must have a minimum part of **$100 USD** for a single developer.
    

## General Rules

-   Complete the project professionally and on time.
    
-   Keep the client updated on progress.
    
-   Do not bypass the server's commission for server-provided clients.
    
-   Contact an admin if there is any dispute or issue.
    
-   Administration has the final decision in any conflict.
    
- You will not get paid if you did not finish the project
    
- Talking with the client outside the server is not allowed
    
- The developers will get paid after the client receive the project for the protection
"
then after the client "user that opened the ticket" finish answering the questions ,the bot will save every answer in a file .md file ,and after finishing the questions the bot will create a embed with the informationss that he collected ,and then send the embed in a discord room "1526392883697942598" with 2 button "accept" and "decline"
if the admin accepted the project :
the project will be sent on Projects room "1526392883697942598" on embed with the saved informationss so the developers can apply for it "on the embed will be a button "apply" " that will send the portfolio of the developer to the client with two buttons "Accept" ,that will add the developer to the client ticket and tell him that his accepted for the project in dm,"decline| ,the bot will tell the developer who applied for the project that his decline by the client in his dm
a image of the system to be clear
![[shapes at 26-07-17 00.26.12.svg]]