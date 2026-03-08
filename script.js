// script.js - LoanIQ

var loans = [];
var tMode = 'year';

function g(id) { return document.getElementById(id); }
function v(id) { return parseFloat(g(id).value) || 0; }

function fmt(n) {
    n = Math.abs(n);
    if (n >= 10000000) return '₹' + (n/10000000).toFixed(2) + ' Cr';
    if (n >= 100000)   return '₹' + (n/100000).toFixed(2) + ' L';
    if (n >= 1000)     return '₹' + (n/1000).toFixed(1) + 'K';
    return '₹' + Math.round(n);
}

function rs(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }

function emi(P, r, n) {
    var m = r / 12 / 100;
    if (!m) return P / n;
    return P * m * Math.pow(1+m,n) / (Math.pow(1+m,n) - 1);
}

function calcTax(income) {
    if (income <= 250000) return 0;
    var t = 0;
    if (income > 1000000) { t += (income-1000000)*0.30; income = 1000000; }
    if (income > 500000)  { t += (income-500000)*0.20;  income = 500000;  }
    if (income > 250000)  { t += (income-250000)*0.05; }
    return Math.round(t * 1.04);
}

function icon(type) {
    return {home:'🏠',car:'🚗',personal:'👤',edu:'🎓',biz:'💼'}[type] || '💰';
}

// ---- TABS ----
function show(id, btn) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    g(id).style.display = 'block';
    btn.classList.add('active');
    if (id == 'compare') buildCompare();
    if (id == 'tax')     taxCalc();
    if (id == 'afford')  affordCalc();
}

// ---- CALCULATOR ----
function setYr(n) {
    g('tenure').value = n;
    document.querySelectorAll('.yr').forEach(b => {
        b.classList.toggle('active', parseInt(b.textContent) == n);
    });
    calc();
}

function calc() {
    var P = v('amt'), r = v('rate'), yr = v('tenure');
    if (!P || !r || !yr) return;

    g('ramt').value  = Math.min(10000000, P);
    g('rrate').value = Math.min(30, r);

    var lbl = P>=10000000 ? (P/10000000).toFixed(2)+' Crore' :
              P>=100000   ? (P/100000).toFixed(2)+' Lakh'    :
              P>=1000     ? (P/1000).toFixed(1)+' Thousand'  : P;
    g('amtlbl').textContent = '= ' + lbl;

    var n = yr * 12;
    var e = emi(P, r, n);
    var tot = e * n;
    var int = tot - P;
    var pp = P/tot*100, ip = int/tot*100;

    g('emi').textContent      = rs(e);
    g('emisub').textContent   = rs(e*12) + ' per year';
    g('total').textContent    = fmt(tot);
    g('interest').textContent = fmt(int);
    g('intpct').textContent   = ip.toFixed(1) + '%';
    g('freeyear').textContent = new Date().getFullYear() + yr;
    g('pfill').style.width    = pp.toFixed(1) + '%';
    g('ppct').textContent     = pp.toFixed(1) + '%';
    g('ipct').textContent     = ip.toFixed(1) + '%';

    var hy = Math.max(1, Math.round(yr/2));
    var he = emi(P, r, hy*12);
    var saved = int - (he*hy*12 - P);
    if (saved > 0) {
        g('tip').style.display = 'flex';
        g('tipt').textContent  = 'Pay in ' + hy + ' years instead of ' + yr + '!';
        g('tipd').textContent  = 'EMI up by ' + rs(he-e) + '/month but save ' + fmt(saved) + ' interest, finish ' + (yr-hy) + ' years early.';
    }

    buildTable(P, r, yr, e);
}

function setMode(mode, btn) {
    tMode = mode;
    document.querySelectorAll('.tog').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    buildTable(v('amt'), v('rate'), v('tenure'), emi(v('amt'), v('rate'), v('tenure')*12));
}

function buildTable(P, r, yr, e) {
    var m = r/12/100, bal = P, html = '';
    if (tMode == 'year') {
        for (var y=1; y<=yr; y++) {
            var yP=0, yI=0;
            for (var mo=0; mo<12; mo++) { var ip=bal*m,pp=e-ip; yI+=ip;yP+=pp;bal-=pp; if(bal<0)bal=0; }
            var done = ((P-Math.max(0,bal))/P*100).toFixed(1);
            html += '<tr><td>Year '+y+'</td><td>'+rs(e*12)+'</td><td style="color:#1565c0">'+rs(yP)+'</td><td style="color:#c62828">'+rs(yI)+'</td><td>'+fmt(Math.max(0,bal))+'</td><td>'+done+'%</td></tr>';
        }
    } else {
        for (var mo=1; mo<=12; mo++) { var ip=bal*m,pp=e-ip; bal-=pp; if(bal<0)bal=0;
            html += '<tr><td>Month '+mo+'</td><td>'+rs(e)+'</td><td style="color:#1565c0">'+rs(pp)+'</td><td style="color:#c62828">'+rs(ip)+'</td><td>'+fmt(Math.max(0,bal))+'</td><td>'+((P-Math.max(0,bal))/P*100).toFixed(2)+'%</td></tr>';
        }
    }
    g('tbody').innerHTML = html;
}

// ---- MY LOANS ----
function saveToMyLoans() {
    var P=v('amt'),r=v('rate'),yr=v('tenure'),type=g('ltype').value;
    if (!P||!r||!yr) { alert('Fill amount, rate, tenure.'); return; }
    var names={home:'Home Loan',car:'Car Loan',personal:'Personal Loan',edu:'Education Loan',biz:'Business Loan'};
    loans.push({id:Date.now(),name:names[type]+' #'+(loans.length+1),type,P,r,yr});
    showLoans();
    show('myloans', document.querySelectorAll('.tab')[1]);
}

function openPopup()  { g('popbg').style.display='flex'; }
function closePopup() { g('popbg').style.display='none'; g('p1').value=''; g('p3').value=''; }

function addLoan() {
    var name=g('p1').value.trim()||'My Loan', type=g('p2').value;
    var P=parseFloat(g('p3').value)||0, r=parseFloat(g('p4').value)||0, yr=parseFloat(g('p5').value)||0;
    if (!P||!r||!yr) { alert('Fill all fields.'); return; }
    loans.push({id:Date.now(),name,type,P,r,yr});
    closePopup(); showLoans();
}

function removeLoan(id) { loans=loans.filter(l=>l.id!=id); showLoans(); }

function showLoans() {
    var tP=0,tE=0,tI=0;
    loans.forEach(l => { var e=emi(l.P,l.r,l.yr*12); tP+=l.P; tE+=e; tI+=e*l.yr*12-l.P; });
    g('ov1').textContent=fmt(tP); g('ov2').textContent=fmt(tI);
    g('ov3').textContent=rs(tE);  g('ov4').textContent=loans.length;

    if (!loans.length) {
        g('loanlist').innerHTML='<div class="empty"><div class="icon">🏦</div><p>No loans yet. Save from Calculator or add manually.</p><button class="btn" onclick="openPopup()">+ Add Loan</button></div>';
        return;
    }
    g('loanlist').innerHTML = loans.map(l => {
        var e=emi(l.P,l.r,l.yr*12), int=e*l.yr*12-l.P;
        return '<div class="lcard"><div class="licon">'+icon(l.type)+'</div><div class="linfo"><div class="lname">'+l.name+'<span class="lbadge">'+l.type+'</span></div><div class="lmeta">'+l.r+'% · '+l.yr+'yr · Ends '+(new Date().getFullYear()+l.yr)+'</div></div><div class="lright"><div class="lemi">'+rs(e)+'/mo</div><div class="lint">Interest: '+fmt(int)+'</div><button class="del" style="margin-top:6px" onclick="removeLoan('+l.id+')">Remove</button></div></div>';
    }).join('');
}

// ---- COMPARE ----
function buildCompare() {
    var P=v('amt'), r=v('rate');
    if (!P||!r) { g('cmptbody').innerHTML='<tr><td colspan="6" style="text-align:center;color:#aaa;padding:18px">Go to Calculator first.</td></tr>'; return; }
    var list=[1,2,3,5,7,10,15,20,25,30], html='';
    list.forEach(t => {
        var e=emi(P,r,t*12), tot=e*t*12, int=tot-P;
        var v2=t<=2?'Ultra Fast':t<=5?'Aggressive':t<=10?'Balanced':t<=20?'Comfortable':'Relaxed';
        var c=t<=2?'#c62828':t<=5?'#e65100':t<=10?'#2e7d32':t<=20?'#1565c0':'#888';
        html+='<tr><td><b>'+t+' yr</b></td><td style="color:#1565c0;font-weight:bold">'+rs(e)+'</td><td>'+rs(e*12)+'</td><td style="color:#c62828">'+fmt(int)+'</td><td>'+fmt(tot)+'</td><td style="color:'+c+';font-weight:bold">'+v2+'</td></tr>';
    });
    g('cmptbody').innerHTML=html;
    var eMin=emi(P,r,360), eMax=emi(P,r,12);
    g('cmptop').innerHTML=
        '<div class="card"><p class="cl">Lowest EMI</p><p class="cv blue">'+rs(eMin)+'</p></div>'+
        '<div class="card"><p class="cl">Highest EMI</p><p class="cv red">'+rs(eMax)+'</p></div>'+
        '<div class="card"><p class="cl">Min Interest</p><p class="cv green">'+fmt(eMax*12-P)+'</p></div>'+
        '<div class="card"><p class="cl">Max Interest</p><p class="cv orange">'+fmt(eMin*360-P)+'</p></div>';
}

// ---- TAX ----
function taxCalc() {
    var income=v('tx1'),loan=v('tx2'),r=v('tx3'),yr=v('tx4'),prop=g('tx5').value,regime=g('tx6').value;
    if (!income||!loan||!r||!yr) return;
    var e=emi(loan,r,yr*12), m=r/12/100, bal=loan, annI=0;
    for (var mo=0;mo<12;mo++) { var ip=bal*m,pp=e-ip; annI+=ip; bal-=pp; if(bal<0)bal=0; }
    var annP=loan/yr, cap=prop=='self'?200000:Infinity;
    var c24=Math.min(annI,cap), c80=Math.min(annP,150000);
    if (regime=='new') {
        g('taxrows').innerHTML='<div class="tipbox red"><span>⚠️</span><div><b>New Regime</b><p>No deductions. Switch to Old Regime to save tax.</p></div></div>';
        g('txs1').textContent=g('txs2').textContent='₹0'; g('txs3').textContent=rs(e); g('taxmsg').innerHTML=''; return;
    }
    var tb=calcTax(income), ta=calcTax(income-c24-c80), ts=tb-ta, mo2=ts/12;
    g('taxrows').innerHTML=
        '<div class="trow"><span>Interest paid (Year 1)</span><span class="red">'+rs(annI)+'</span></div>'+
        '<div class="trow"><span>Section 24b deduction</span><span class="blue">'+rs(c24)+'</span></div>'+
        '<div class="trow"><span>Section 80C deduction</span><span class="blue">'+rs(c80)+'</span></div>'+
        '<div class="trow"><span>Tax before</span><span class="red">'+rs(tb)+'</span></div>'+
        '<div class="trow"><span>Tax after</span><span class="green">'+rs(ta)+'</span></div>';
    g('txs1').textContent=rs(ts); g('txs2').textContent=rs(mo2)+'/mo'; g('txs3').textContent=rs(Math.max(0,e-mo2));
    g('taxmsg').innerHTML=ts>0?'<div class="tipbox green"><span>🎉</span><div><b>You save '+rs(ts)+' per year in taxes!</b><p>Real EMI after tax = '+rs(Math.max(0,e-mo2))+'/month.</p></div></div>':'';
}

// ---- AFFORD ----
function affordCalc() {
    var sal=v('af1'),exp=v('af2'),ext=v('af3'),lim=v('af4'),r=v('af5'),yr=v('af6');
    if (!sal) return;
    var maxEMI=(sal*lim/100)-ext, n=yr*12, m=r/12/100;
    var maxLoan=m>0&&maxEMI>0 ? maxEMI*(Math.pow(1+m,n)-1)/(m*Math.pow(1+m,n)) : maxEMI>0?maxEMI*n:0;
    var ratio=ext/sal*100;
    var health=ratio<20?'Excellent':ratio<35?'Good':ratio<50?'Moderate':'High Risk';
    var hc=ratio<20?'#2e7d32':ratio<35?'#558b2f':ratio<50?'#e65100':'#c62828';
    g('afcards').innerHTML=
        '<div class="card"><p class="cl">Max Safe EMI</p><p class="cv blue">'+rs(Math.max(0,maxEMI))+'</p></div>'+
        '<div class="card"><p class="cl">Max Loan</p><p class="cv green">'+fmt(Math.max(0,maxLoan))+'</p></div>'+
        '<div class="card"><p class="cl">Disposable</p><p class="cv orange">'+rs(Math.max(0,sal-exp-ext))+'</p></div>'+
        '<div class="card"><p class="cl">Financial Health</p><p class="cv" style="color:'+hc+'">'+health+'</p></div>';
    g('afmsg').innerHTML=maxLoan>0
        ?'<div class="tipbox green"><span>✅</span><div><b>Max safe loan: '+fmt(maxLoan)+'</b><p>With '+lim+'% EMI limit → max EMI is '+rs(Math.max(0,maxEMI))+'/month.</p></div></div>'
        :'<div class="tipbox red"><span>❌</span><div><b>Affordability Problem</b><p>Existing EMIs too high. Pay off some loans first.</p></div></div>';
}

// ---- START ----
calc();
showLoans();