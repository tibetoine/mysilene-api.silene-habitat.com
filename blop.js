


let strSDate = '2020-03-31'
let strSDate2 = '‎2020-‎03-‎31'

let split = strSDate2.split('-')

let year = parseInt(split[0])
let m = split[1]
let d = split[2]

var str = "Hello world, welcome to the universe.";
var n = str.startsWith("Hello");
console.log(n)

console.log(typeof m, m)
let s = '03'
console.log(typeof s, s)
console.log(s.startsWith("0"))

console.log(m.startsWith("0"))
if (m.startsWith('0')) {
    console.log('m')
    m = m.substring(1)
}

if (d.startsWith('0')) {
    d = d.substring(1)
}

console.log(year, m, d )

let yearInt = parseInt(year,10)
let mInt = parseInt(m,10)
let dInt = parseInt(d,10)

console.log(yearInt, mInt, dInt )



// console.log(new Date('‎2020-‎03-‎31'))


