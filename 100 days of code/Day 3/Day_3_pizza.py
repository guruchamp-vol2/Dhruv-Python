print("Welcome to Dhruv Pizza Deliveries!")
bill=0
size=input("What size do you want your pizza S, M or L? ")
peponi=input("Do you want pepperoni on your pizza? Y or N? ")
extra_cheese=input("Do you want extra cheese? Y or N? ")
if size=="S":
    bill=15
elif size=="M":
    bill=20
elif size=="L":
    bill=25
if peponi=="Y":
    if size=="S":
        bill=bill+2
if size=="M"or"L":
    if peponi=="Y":
        bill=bill+3
if extra_cheese=="Y":
    bill=bill+1
print("Your bill is $"+str(bill))