var dec=16
var binaryInString = (dec >>> 0).toString(2)
// console.log(binaryInString)


while (binaryInString.length <=32) {
    binaryInString = '0'+binaryInString
}

// console.log(binaryInString)


console.log(canBeOPen(binaryInString))
// console.log(canBeOPen('abcdefghij'))
function canBeOPen(binary) {
    var paramLength = binary.length
    var openItemsDigitValue = binary.substring(paramLength-6, paramLength-6+1)

    return (openItemsDigitValue==1)

}

