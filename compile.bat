@echo off
"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /target:winexe /out:client\public\LOCAUS-PC.exe /reference:System.dll /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Net.dll client\public\LOCAUS-PC.cs
