import random
#random.randint gives a number random betwen a and b includeing a and b
random1=random.randint(1,10)
print(random1)
#random.random gives a number greater than equal to 0 and less than 1
random2=random.random()
print(random2)
#random.uniform gives a number greater than equal to a and less than equal to b (this number can have a decimal point)
random3=random.uniform(1,10)
print(random3)
#Pause Challenge Heads or Tails
heta=random.randint(1,2)
if heta==1:
    print("Heads")
elif heta==2:
    print("Tails")