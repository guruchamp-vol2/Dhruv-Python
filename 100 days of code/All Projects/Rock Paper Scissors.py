rock = '''
    _______
---'   ____)
      (_____)
      (_____)
      (____)
---.__(___)
'''
 
paper = '''
    _______
---'   ____)____
          ______)
          _______)
         _______)
---.__________)
'''
 
scissors = '''
    _______
---'   ____)____
          ______)
       __________)
      (____)
---.__(___)
'''
imiges=[rock,paper,scissors]
import random
rps=int(input("What do you choose? 0 for rock, 1 for paper, 2 for scissors. "))
print(imiges[rps])
crps=random.randint(0,2)
print("Computer chose:")
print(imiges[crps])
if rps==0 and crps==2:
    print("You Win!")
elif crps > rps:
    print("You Lose!")
elif rps > crps:
    print("You Win!")
elif crps==rps:
    print("It's a draw!")
elif crps==0 and rps==2:
    print("You Lose!")