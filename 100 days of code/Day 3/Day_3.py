#This code is just for practice
print("Welcome to the arcade")
print("Welcome to the up-chucker")
height=int(input("What is your height in in?"))
bill=0
age=int(input("How old are you?"))
if height>=47.2441:
    print("Hi tall guy")
    if age<=12:
     bill=5
     print("To get in you will have to pay $5")
elif age<=18: 
    bill=7
    print("To get in you will have to pay $7")
elif age>19:
   bill=12
   print("To get in you will hafe to pay $12")
photo=input("Do you want a photo y or n?")
if photo=="y":
   bill=bill+3
   print("Your total bill is ${bill}.")
# % tells the remainder on a division problem.
#Pause challenge
#ODD or EVEN
print("Welcome to ODD or EVEN")
num=int(input("Tell you number"))
if height%2==0:
    print("Your number is even")
else:
    print("Your number is odd")