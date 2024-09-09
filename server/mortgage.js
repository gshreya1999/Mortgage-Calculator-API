const express = require('express');
const router = express.Router();

const calculateMortgage = function(principal, rateOfInterest, n) {
    
    const factor = Math.pow(1+rateOfInterest, n);
    let payment = rateOfInterest * factor;
    payment /= (factor-1);
    return payment*principal;
};

/* CMHC Insurance rate only considers the BC Mortgage default rate 
 *(no non-traditional downpayment or self-employed non-verified income) 
 */
const calculateCMHCInsurance = function(downPayment, propertyPrice) {
    
    const downPaymentPercent = downPayment * 100/propertyPrice;
    if(downPaymentPercent >= 20 || propertyPrice > 1000000) {
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

const verifyMinimumDownPayment = function(downPayment, propertyPrice) {

    const percent = downPayment * 100/propertyPrice;
    if(percent < 5) {
        return false;
    }
    if(propertyPrice > 1000000 && percent <= 20) {
        return false;
    }
    if(propertyPrice > 500000) {
        let minDownPayment = 0.05*500000 + 0.1*(propertyPrice-500000);
        if(downPayment<minDownPayment)
            return false;
    }
    return true;
};

const verifyAmortizationPeriod = function(downPayment, propertyPrice, amortizationPeriod) {

    const downPaymentPercent = downPayment * 100/propertyPrice;
    if(amortizationPeriod>25 && downPaymentPercent<20) {
        return false;
    }

    if (amortizationPeriod < 5 || amortizationPeriod > 30 || amortizationPeriod%5 != 0) {
        return false;
    }

    return true;
}

// Reference for difference between monthly, bi-weekly and accelerated bi-weekly payment: https://wowa.ca/accelerated-bi-weekly-mortgage-payments
// Values matching with: https://apps.royalbank.com/apps/mortgages/mortgage-payment-calculator/#top-page-content-2
const getPaymentPerPaymentSchedule = function(monthlyPayment, paymentSchedule) {

    if(paymentSchedule.toLowerCase() === "monthly") {
        return monthlyPayment;
    }
    if(paymentSchedule.toLowerCase() === "bi-weekly") {
        return monthlyPayment*12/26;
    }
    if(paymentSchedule.toLowerCase() === "accelerated bi-weekly") {
        return monthlyPayment/2;
    }

    return 0;
}

router.post('/calculate-mortgage', (req, res) => {

    try {
        const { propertyPrice, downPayment, annualInterestRate, amortizationPeriod, paymentSchedule } = req.body;
        if (!propertyPrice || !downPayment || !annualInterestRate || !amortizationPeriod || !paymentSchedule) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (
            isNaN(propertyPrice) || propertyPrice <= 0 ||
            isNaN(downPayment) || downPayment <= 0 ||
            isNaN(annualInterestRate) || annualInterestRate <= 0 ||
            isNaN(amortizationPeriod) || amortizationPeriod <= 0
          ) {
            return res.status(400).json({ error: 'Property price, down payment, amortization period and annual interest rate must be positive numbers' });
        }
      
          if (typeof paymentSchedule !== 'string') {
            return res.status(400).json({ error: 'Payment schedule must be string' });
        }
        if(downPayment >= propertyPrice) {
            return res.status(400).json({ error: 'Invalid inputs' });
        }

        if(!verifyAmortizationPeriod(downPayment, propertyPrice, amortizationPeriod)) {
            return res.status(400).json({ error: 'Invalid Amortization Period!' });
        }
        if(!verifyMinimumDownPayment(downPayment, propertyPrice)) {
            return res.status(400).json({ error: 'Downpayment is too low!' });
        }

        let CMHCInsurancePercent = calculateCMHCInsurance(downPayment, propertyPrice);
        let principal = propertyPrice-downPayment;
        let cmhcInsurance = CMHCInsurancePercent*principal/100;
        principal += cmhcInsurance;

        let semiAnnualInterestRate = annualInterestRate/200; // compounded semi-annually
        let monthlyInterestRate = Math.pow((1+semiAnnualInterestRate),1/6) -1;
        let n = 12*amortizationPeriod;

        let mortgagePayment = calculateMortgage(principal, monthlyInterestRate, n);
        mortgagePayment = getPaymentPerPaymentSchedule(mortgagePayment, paymentSchedule);
        if(!mortgagePayment) {
            return res.status(400).json({ error: 'Payment schedule is invalid!' });
        }

        return res.status(200).json({
            mortgagePayment: mortgagePayment.toFixed(2),
            cmhcInsurance: cmhcInsurance.toFixed(2)
        });

    } catch(error) {
        res.status(400).json({ error: error.message });
    }

});

module.exports = router;