01 DIM A#(1), B%(2), M$(6)
02 DIM C%(3,2)

10 CLS
11 A#(0) = 200.5 : A#(1) = -200.5
12 FOR X% = 0 TO 3 : FOR Y% = 0 TO 2 : C%(X%,Y%) = X% * Y% : NEXT : NEXT
20 PRINT USING$("####.#", A#(0)), USING$("####.#", A#(1))
21 PRINT USING$("+###.#", A#(0)), USING$("+###.#", A#(1))
22 PRINT USING$("###.#-", A#(0)), USING$("###.#-", A#(1))
23 PRINT USING$("###.#+", A#(0)), USING$("###.#+", A#(1))
24 BEEP

30 CLS
31 A#(0) = 123.4 : A#(1) = 432.1
32 B%(0) = 12345 : B%(1) = 10000 : B%(2) = 256
33 M$(0) = " OK"
34 M$(1) = "###.#" : M$(2) = "####" : M$(3) = "#####" 
35 M$(4) = "00000" : M$(5) = "##.##" : M$(6) = "###"
40 PRINT USING$(M$(1),A#(0)), USING$(M$(1),A#(1)), 
41 PRINT USING$(M$(2),12); M$(0)
42 PRINT USING$(M$(3),B%(0)), B%(1), B%(2)
43 PRINT USING$(M$(4),12345), 123, 1
50 A#(0) = 25.3 
51 PRINT USING$(M$(5),A#(0)); M$(0)
52 PRINT USING$(M$(5),25.345) 
60 B%(0) = +123 
61 PRINT USING$(M$(6),B%(0)); M$(0)
62 BEEP 

70 CLS
80 PRINT USING "###";-123
81 PRINT USING "+####";123,-123 
82 PRINT USING "####+";123,-123 
83 PRINT USING "###-";123,-123 
84 PRINT USING "**######";123
85 PRINT USING "**######";-234 
86 PRINT USING "$$###" ;1234 
87 PRINT USING "+$$###";-1234
88 PRINT USING "###,###.##";1500.3
89 PRINT USING "#####^^^^";10000
90 PRINT USING "###.#"; 1, 2.2, 4
91 BEEP

