from math import sqrt
import turtle
pete= turtle.Turtle()
a=int(input("What is the lenght of side a?: "))
b=int(input("What is the lenght of side b?: "))
c=sqrt(((a**2)+(b**2)))
print("The value of c is :",c)
pete.forward(a)
pete.left(90)
pete.forward(b)
pete.left(135)
pete.forward(c)
turtle.done()