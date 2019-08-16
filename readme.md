


A few thoughts here.

there is a slingshot object. in mouse mode it should be anchored inside the stage and
moved by the mouse cursor

in immersive mode it should be put inside of a controller object

the answer is that when a level is loaded the mouse creates one slingshot and the immersive creates one for each controller.
when a level is removed they should remove the slingshots

during runtime the mouse should sync the slingshot object
during runtime the immersive should sync the slingshot object

the three module should create a three slingshot object when a slingshot it created, but it shouldn't add to the scene. leave
that up to the mouse and immersive modules.

 