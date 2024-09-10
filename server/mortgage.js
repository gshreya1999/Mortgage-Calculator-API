const express = require('express');
const router = express.Router();
const config = require('./config');

// Function to calculate mortgage with the mortgage payment formula
const calculateMortgage = function(principal, rateOfInterest, n) {
    
    const factor = Math.pow(1+rateOfInterest, n);
    let payment = rateOfInterest * factor;
    payment /= (factor-1);
    return payment*principal;
};

/*
 * CMHC Insurance rate only considers the BC Mortgage default rate 
 *(no non-traditional downpayment or self-employed non-verified income) 
 */
const calculateCMHCInsuranceRate = function(downPayment, propertyPrice) {
    
    const downPaymentPercent = downPayment * 100/propertyPrice;
    if(downPaymentPercent >= 20 || propertyPrice > config.MILLION_DOLLARS) {
        return 0;
    }

    let insurancePercent = 4;
    if(downPaymentPercent>=10 && downPaymentPercent<15) {
        insurancePercent = 3.1;
    } else if(downPaymentPercent>=15 && downPaymentPercent<20) {
        insurancePercent = 2.8;
    }
    return insurancePercent;
}

// Function to verify if the down payment is valid
const verifyMinimumDownPayment = function(downPayment, propertyPrice) {

    const downPaymentPercent = downPayment * 100/propertyPrice;
    
    // Downpayment has to be 5% or more
    if(downPaymentPercent < config.MINIMUM_DOWN_PAYMENT_IN_PERCENT) {
        return false;
    }
    if(propertyPrice > config.MILLION_DOLLARS && downPaymentPercent <= 20) {
        return false;
    }
    if(propertyPrice > config.FIVE_HUNDRED_THOUSAND_DOLLARS) {
        let requiredDownPayment = 0.05 * config.FIVE_HUNDRED_THOUSAND_DOLLARS + 0.1 * (propertyPrice - config.FIVE_HUNDRED_THOUSAND_DOLLARS);
        if(downPayment < requiredDownPayment)
            return false;
    }
    return true;
};

// Function to verify if the Amortization period is valid
const verifyAmortizationPeriod = function(downPayment, propertyPrice, amortizationPeriod) {

    const downPaymentPercent = downPayment * 100/propertyPrice;
    
    // Amortization period has to be less than 25 years for CMHC insurance
    // So, downpayment needs to be  20% or more for amortization period over 25 years
    if(amortizationPeriod>25 && downPaymentPercent<20) {
        return false;
    }

    // Ensuring amortization period is one of 5, 10, 15, 20, 25, 30
    if (amortizationPeriod < 5 || amortizationPeriod > 30 || amortizationPeriod%5 != 0) {
        return false;
    }

    return true;
}

const getPaymentPerPaymentSchedule = function(monthlyPayment, paymentSchedule) {

    if(paymentSchedule.toLowerCase() === config.PaymentSchedules.MONTHLY) {
        return monthlyPayment;
    }
    // Bi-weekly payment is monthly payment in a year divided by 26 payments; same yearly amount as monthly payments
    if(paymentSchedule.toLowerCase() === config.PaymentSchedules.BI_WEEKLY) {
        return monthlyPayment * 12 / 26;
    }
    // Accelerated Bi-weekly payment is half of a monthly payment paid 26 times a year; equivalent to 13 months a years
    if(paymentSchedule.toLowerCase() === config.PaymentSchedules.ACCELERATED_BI_WEEKLY) {
        return monthlyPayment / 2;
    }

    return 0;
}

// Validation Middleware
const validateMortgageInputs = (req, res, next) => {

    try{
        let { propertyPrice, downPayment, annualInterestRate, amortizationPeriod, paymentSchedule } = req.body;
        if (!propertyPrice || !downPayment || !annualInterestRate || !amortizationPeriod || !paymentSchedule) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const isValidPositiveNumber = (value) => /^\d+(\.\d+)?$/.test(value) && parseFloat(value) > 0;

        if (
            !isValidPositiveNumber(propertyPrice) ||
            !isValidPositiveNumber(downPayment) ||
            !isValidPositiveNumber(annualInterestRate) ||
            !isValidPositiveNumber(amortizationPeriod)
          ) {
            return res.status(400).json({ error: 'Property price, down payment, amortization period and annual interest rate must be positive numbers' });
        }

        propertyPrice = parseFloat(propertyPrice);
        downPayment = parseFloat(downPayment);
        annualInterestRate = parseFloat(annualInterestRate);
        amortizationPeriod = parseFloat(amortizationPeriod, 10);
      
        if(downPayment >= propertyPrice) {
            return res.status(400).json({ error: 'Invalid inputs: down payment cannot be greater than or equal to the property price' });
        }

        if(typeof(paymentSchedule) !== 'string') {
            return res.status(400).json({ error: 'Payment schedule must be string' });
        }

        if(!verifyAmortizationPeriod(downPayment, propertyPrice, amortizationPeriod)) {
            return res.status(400).json({ error: 'Invalid Amortization Period!' });
        }
        if(!verifyMinimumDownPayment(downPayment, propertyPrice)) {
            return res.status(400).json({ error: 'Downpayment is too low!' });
        }

        next();

    } catch(error) {
        res.status(400).json({ error: error.message });
    }

};

router.post('/calculate-mortgage', validateMortgageInputs, (req, res) => {

    try {
        let { propertyPrice, downPayment, annualInterestRate, amortizationPeriod, paymentSchedule } = req.body;
         
        propertyPrice = parseFloat(propertyPrice);
        downPayment = parseFloat(downPayment);
        annualInterestRate = parseFloat(annualInterestRate);
        amortizationPeriod = parseFloat(amortizationPeriod, 10);

        let CMHCInsurancePercent = calculateCMHCInsuranceRate(downPayment, propertyPrice);
        let principal = propertyPrice-downPayment;
        let cmhcInsurance = CMHCInsurancePercent*principal/100;
        principal += cmhcInsurance;

        // Interest rate is compounded semi-annually
        let semiAnnualInterestRate = annualInterestRate/200;
        // Effective monthly interest rate based on semi annual compounding
        let monthlyInterestRate = Math.pow((1+semiAnnualInterestRate),1/6) -1;
        let n = 12*amortizationPeriod;

        let mortgagePayment = calculateMortgage(principal, monthlyInterestRate, n);
        mortgagePayment = getPaymentPerPaymentSchedule(mortgagePayment, paymentSchedule);
        if(!mortgagePayment) {
            return res.status(400).json({ error: 'Payment schedule is invalid!' });
        }

        return res.status(200).json({
            paymentPerPaymentSchedule: mortgagePayment.toFixed(2),
            cmhcInsurance: cmhcInsurance.toFixed(2)
        });

    } catch(error) {
        res.status(400).json({ error: error.message });
    }

});

module.exports = router;