10 CLS
20 A$ = "Lorem ipsum dolor sit amet."
30 B% = 2021
40 C! = 3.14154
50 D# = 3.14159265359
60 PRINT "String: ";A$
70 PRINT "Integer: ";B%
80 PRINT "Single: ";C!
90 PRINT "Double: ";D#
100 LET E = B% + 0.5
110 PRINT "Integer to Single: "; E
120 B% = "123"
130 PRINT "String to Integer: "; B%
140 A$ = B%
150 PRINT "Integer to String: "; A$
160 B% = 3.1415
170 PRINT "Single to Integer: "; B%
180 C! = B%
190 PRINT "Integer to Single: "; C!
200 A$ = C!
210 PRINT "Single to String: "; A$
220 C! = "-1.5"
230 PRINT "String to Single: "; C!
240 D# = "1.500001"
250 PRINT "String to Double: "; C!
260 BEEP
