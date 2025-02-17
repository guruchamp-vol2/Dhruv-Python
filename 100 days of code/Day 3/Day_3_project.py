print('''*******************************************************************************
          |                   |                  |                     |
 _________|________________.=""_;=.______________|_____________________|_______
|                   |  ,-"_,=""     `"=.|                  |
|___________________|__"=._o`"-._        `"=.______________|___________________
          |                `"=._o`"=._      _`"=._                     |
 _________|_____________________:=._o "=._."_.-="'"=.__________________|_______
|                   |    __.--" , ; `"=._o." ,-"""-._ ".   |
|___________________|_._"  ,. .` ` `` ,  `"-._"-._   ". '__|___________________
          |           |o`"=._` , "` `; .". ,  "-._"-._; ;              |
 _________|___________| ;`-.o`"=._; ." ` '`."\` . "-._ /_______________|_______
|                   | |o;    `"-.o`"=._``  '` " ,__.--o;   |
|___________________|_| ;     (#) `-.o `"=.`_.--"_o.-; ;___|___________________
____/______/______/___|o;._    "      `".o|o_.--"    ;o;____/______/______/____
/______/______/______/_"=._o--._        ; | ;        ; ;/______/______/______/_
____/______/______/______/__"=._o--._   ;o|o;     _._;o;____/______/______/____
/______/______/______/______/____"=._o._; | ;_.--"o.--"_/______/______/______/_
____/______/______/______/______/_____"=.o|o_.--""___/______/______/______/____
/______/______/______/______/______/______/______/______/______/______/_______/
*******************************************************************************''')
print("Welcome to Treasure Island")
print("Your mission is to find Capt.Blackbeard hidden treasure.")
lor=input("You're at a crossroad do you want to go left or right? ").lower()
door1=""

if lor=="left":
   lake=input("You come to a lake, you see a island in the middle do you want to SWIM across or do you want to WAIT for a boat ").lower()
   if lake=="wait":
    door1=input("You arrive at the island unharmed. There is a house with 3 doors. One red, one yellow and one blue. Which color do you choose? ").lower()
    if door1=="yellow":
      print(" It is a room full of spiders,better luck next time.")
    if door1=="blue":
      print("It is a room full of treasure,You win!!!")
    if door1=="red":
      print("It is a room full of fire, better luck next time.")
   else:
     print("As you were swimming, piranhas at you alive better luck next time")
else:
    print("You fell into a hole, better luck next time.")