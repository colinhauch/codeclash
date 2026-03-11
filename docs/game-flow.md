# Detailed Game Flow

## Setup
- All of the players are randomly ordered into a list (called the seatingOrder or something). The starting player for each round will index incrementally down the list.
- The deck, containing 79 number cards, 6 modifier cards, and 9 action cards is shuffled. The order of this deck is the only hidden information in the game.
- Once the deck is shuffled, it becomes the first round.

## Each Round
### Round Setup
A starting player needs to be selected. Each round should have a different starting player from the round before. The very first round should have a randomly selected starting player.
### Playing a round
- A round consists of active players conducting turns in sequence until there are no active players.
### Ending a Round
- A round ends when there are no active players remaining.

## Each turn
A player is provided with the following information before 
- all of the current player's playerState objects
- all of the information in the gameState object, except the exact order of the shuffled cards

A player may decide to `draw` or to `stay`.

- If they stay: the player becomes inactive and their current roundScore is added to their gameScore.
- If they draw: a card is removed from the shuffled deck and given to the player. The 3 types of cards behave slightly differently
    - If a number card is drawn: it is added to the player's numberCards array, then the game needs to check if they have busted.
        - If the player busts: their roundScore is set to 0 and they are set to inactive. All of their cards are added to the discard pile
        - If the player doesn't bust: 
            - check for a win (if their gameScore + round score is 200 or greater). 
            - check for flip 7
            - it becomes the next active player's turn
    - If a modifier card is drawn: it is added to the player's modifierCards array and it becomes the next active player's turn. It is impossible to bust or get flip 7 with a modifier card.
    - If an action card is drawn: it must be resolved immediately
        - The player that drew the card needs to select an active player to recieve the effects of the action card. They may choose themselves, or any other active player. 
        - Once an active player has been choosen, the action card must be resolved. 
        - Once the action card is resolved, it becomes the next active player's turn.
