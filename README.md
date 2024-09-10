# BC Mortgage Calculator API

### Endpoint:
**POST** `/api/calculate-mortgage`

### Description:
This API calculates the mortgage payment and CMHC insurance for a given property based on user-provided inputs such as property price, down payment, interest rate, amortization period, and payment schedule.

## Input:

The request should include a JSON object with the following fields:

| Parameter            | Type    | Description                                                                 |
|----------------------|---------|-----------------------------------------------------------------------------|
| `propertyPrice`       | Number  | The price of the property in CAD. Must be a positive number.                |
| `downPayment`         | Number  | The down payment in CAD. Must be less than `propertyPrice` and positive.    |
| `annualInterestRate`  | Number  | The annual nominal interest rate as a percentage (e.g., 5 for 5%).          |
| `amortizationPeriod`  | Number  | The amortization period in years (between 5 and 30 in 5-year increments).   |
| `paymentSchedule`     | String  | The payment schedule. Options: `accelerated bi-weekly`, `bi-weekly`, `monthly`. |

---

## Output:

The API will return a JSON object with the following fields:

| Parameter                   | Type    | Description                                                            |
|-----------------------------|---------|------------------------------------------------------------------------|
| `paymentPerPaymentSchedule`  | Number  | The payment per payment schedule in CAD.                               |
| `cmhcInsurance`              | Number  | The total CMHC insurance to be paid over the amortization period, in CAD. |

---

## Important Points to Remember:

1. This API uses a semi-annual compounding period, meaning the compounding happens twice a year. Thus, for each payment schedule, the effective compounding period is used.
   
2. The difference between Monthly, Bi-weekly, and Accelerated Bi-weekly payments can be referenced from: [WOWA - Accelerated Bi-weekly Mortgage Payments](https://wowa.ca/accelerated-bi-weekly-mortgage-payments)

3. The result of this API was verified by matching it to RBC’s mortgage calculator (with property values over $1,000,000, as CMHC insurance doesn’t apply). It can be found here: [RBC Mortgage Payment Calculator](https://apps.royalbank.com/apps/mortgages/mortgage-payment-calculator/#top-page-content-2)

4. You can verify results for property values under one million dollars by adjusting the mortgage value based on CMHC calculations and using the RBC mortgage calculator with the new mortgage value. More information on CMHC insurance can be found here: [RateHub - CMHC Insurance](https://www.ratehub.ca/cmhc-insurance-british-columbia)
