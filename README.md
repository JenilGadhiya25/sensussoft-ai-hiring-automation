# Local AI Hiring Demo

આ પ્રોજેક્ટ એ એક લોકલ AI આધારિત હાયરિંગ ડેમો છે, જેમાં કૅન્ડિડેટના ફોર્મ સબમિશનથી લઈને સ્કોરિંગ, અસાઇનમેન્ટ જનરેશન, GitHub રિપોઝિટરી ક્રિએશન અને ઇમેઇલ નોટિફિકેશન સુધીની સંપૂર્ણ પ્રક્રિયા ઓટોમેટેડ છે.

## ફોલ્ડર સ્ટ્રક્ચર

- `webhook-server/` : મુખ્ય Node.js સર્વર જે કૅન્ડિડેટ ફોર્મ ડેટા પ્રોસેસ કરે છે, અસાઇનમેન્ટ જનરેટ કરે છે, GitHub રિપોઝ બનાવે છે અને ઇમેઇલ મોકલે છે.
- `github-demo/` : GitHub રિપોઝિટરી ક્રિએશન માટેની સર્વિસ (mock/demo).
- `openclaw-skills/` : OpenClaw માટેના સ્કિલ્સ અને ડેમો ઇન્ટિગ્રેશન.
- `audit-logs/` : બધા કૅન્ડિડેટના રો અને પ્રોસેસ્ડ લોગ્સ (JSON).
- `demo-form/` : ફ્રન્ટએન્ડ HTML ફોર્મ ડેમો (લોકલ ટેસ્ટ માટે).

## webhook-server

- `server.js` : મુખ્ય API એન્ડપોઇન્ટ `/api/career-apply` જે કૅન્ડિડેટની માહિતી લે છે, સ્કોર અને અસાઇનમેન્ટ જનરેટ કરે છે, GitHub રિપોઝ બનાવે છે અને PDF સાથે ઇમેઇલ મોકલે છે.
- `.env.example` : જરૂરી એન્વાયર્નમેન્ટ વેરિએબલ્સનું ઉદાહરણ.

## કૅન્ડિડેટ પ્રોસેસિંગ ફ્લો

1. **ફોર્મ સબમિટ**: કૅન્ડિડેટ ફ્રન્ટએન્ડ ફોર્મથી એપ્લાય કરે છે.
2. **Audit Log**: રો ડેટા `audit-logs/candidate-log.json` માં સેવ થાય છે.
3. **Screening & Assignment**: કૅન્ડિડેટના રોલ અને સ્કિલ્સ પરથી સ્કોર અને અસાઇનમેન્ટ જનરેટ થાય છે.
4. **GitHub Repo**: દરેક કૅન્ડિડેટ માટે પ્રાઇવેટ રિપોઝિટરી બનાવાય છે.
5. **Email & PDF**: કૅન્ડિડેટને અસાઇનમેન્ટ PDF સાથે ઇમેઇલ મોકલાય છે.
6. **Processed Log**: આખી પ્રોસેસ પછીનું JSON પણ audit-logs માં સેવ થાય છે.

## રન કરવા માટે

```sh
cd webhook-server
npm install
cp .env.example .env # અને તમારી Gmail/SMTP વિગતો ભરો
npm start
```

## Dependencies
- express
- dotenv
- node-fetch
- nodemailer
- pdfkit

## નોંધ
- આ પ્રોજેક્ટ ડેમો માટે છે. GitHub અને ઇમેઇલ ફીચર્સ માટે યોગ્ય API કી અને ક્રેડેન્શિયલ્સ જરૂરી છે.
- OpenClaw integration future scope માટે છે.

---

For English documentation, ask for it!
