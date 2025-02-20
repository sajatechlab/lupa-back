export interface InvoiceData {
  FileName: string;

  // General Invoice Fields (FAD Section)
  UBLVersionID?: string;
  CustomizationID?: string;
  ProfileID?: string;
  ProfileExecutionID?: string;
  InvoiceID?: string;
  UUID?: string;
  UUIDSchemeID?: string;
  UUIDSchemeName?: string;
  IssueDate?: string;
  IssueTime?: string;
  DueDate?: string;
  InvoiceTypeCode?: string;
  Note?: string;
  DocumentCurrencyCode?: string;
  LineCountNumeric?: number;
  InvoicePeriodStartDate?: string;
  InvoicePeriodStartTime?: string;
  InvoicePeriodEndDate?: string;
  InvoicePeriodEndTime?: string;
  OrderReferenceID?: string;
  OrderReferenceIssueDate?: string;
  BillingReferenceID?: string;
  BillingReferenceUUID?: string;
  BillingReferenceSchemeName?: string;
  BillingReferenceIssueDate?: string;
  DespatchDocumentReferenceID?: string;
  DespatchDocumentReferenceIssueDate?: string;
  ReceiptDocumentReferenceID?: string;
  ReceiptDocumentReferenceIssueDate?: string;
  AdditionalDocumentReferenceID?: string;
  AdditionalDocumentReferenceIssueDate?: string;
  AdditionalDocumentTypeCode?: string;

  // Delivery Section
  InvoiceActualDeliveryDate?: string;
  InvoiceActualDeliveryTime?: string;
  InvoiceDeliveryAddressID?: string;
  InvoiceDeliveryAddressCityName?: string;
  InvoiceDeliveryAddressCountrySubentity?: string;
  InvoiceDeliveryAddressPostalZone?: string;
  InvoiceDeliveryAddressLine?: string;
  InvoiceDeliveryAddressCountryCode?: string;
  InvoiceDeliveryContactName?: string;
  InvoiceDeliveryContactTelephone?: string;
  InvoiceDeliveryContactTelefax?: string;
  InvoiceDeliveryContactElectronicMail?: string;

  // DeliveryTerms Section
  InvoiceDeliveryTermsID?: string;
  InvoiceDeliveryTermsSpecialTerms?: string;
  InvoiceDeliveryTermsLossRiskResponsibilityCode?: string;
  InvoiceDeliveryTermsLossRisk?: string;

  // PrepaidPayment Section
  InvoicePrepaidPaymentID?: string;
  InvoicePrepaidPaymentPaidAmount?: string;
  InvoicePrepaidPaymentCurrencyID?: string;
  InvoicePrepaidPaymentReceivedDate?: string;
  InvoicePrepaidPaymentPaidDate?: string;
  InvoicePrepaidPaymentPaidTime?: string;
  InvoicePrepaidPaymentInstructionID?: string;

  // AllowanceCharge Section
  InvoiceAllowanceChargeID?: string;
  InvoiceAllowanceChargeChargeIndicator?: string;
  InvoiceAllowanceChargeReasonCode?: string;
  InvoiceAllowanceChargeReason?: string;
  InvoiceAllowanceChargeMultiplierFactorNumeric?: string;
  InvoiceAllowanceChargeAmount?: string;
  InvoiceAllowanceChargeAmountCurrencyID?: string;
  InvoiceAllowanceChargeBaseAmount?: string;
  InvoiceAllowanceChargeBaseAmountCurrencyID?: string;

  // PaymentExchangeRate Section
  InvoicePaymentExchangeRateSourceCurrencyCode?: string;
  InvoicePaymentExchangeRateSourceCurrencyBaseRate?: string;
  InvoicePaymentExchangeRateTargetCurrencyCode?: string;
  InvoicePaymentExchangeRateTargetCurrencyBaseRate?: string;
  InvoicePaymentExchangeRateCalculationRate?: string;
  InvoicePaymentExchangeRateDate?: string;

  // PaymentAlternativeExchangeRate Section
  InvoicePaymentAlternativeExchangeRateSourceCurrencyCode?: string;
  InvoicePaymentAlternativeExchangeRateSourceCurrencyBaseRate?: string;
  InvoicePaymentAlternativeExchangeRateTargetCurrencyCode?: string;
  InvoicePaymentAlternativeExchangeRateTargetCurrencyBaseRate?: string;
  InvoicePaymentAlternativeExchangeRateCalculationRate?: string;

  // TaxTotal Section
  InvoiceTaxTotalTaxAmount?: string;
  InvoiceTaxTotalTaxAmountCurrencyID?: string;

  // WithholdingTaxTotal Section
  InvoiceWithholdingTaxTotalTaxAmount?: string;
  InvoiceWithholdingTaxTotalTaxAmountCurrencyID?: string;

  // LegalMonetaryTotal Section
  InvoiceLineExtensionAmount?: string;
  InvoiceTaxExclusiveAmount?: string;
  InvoiceTaxInclusiveAmount?: string;
  InvoiceAllowanceTotalAmount?: string;
  InvoiceChargeTotalAmount?: string;
  InvoicePayableRoundingAmount?: string;
  InvoicePayableAmount?: string;
  InvoicePayableAmountCurrencyID?: string;

  // UBLExtensions Section
  UBLExtensions?: string;
  UBLExtension?: string;
  ExtensionContent?: string;
  DianExtensions?: string;
  InvoiceControl?: string;
  InvoiceAuthorization?: string;
  AuthorizationPeriodStartDate?: string;
  AuthorizationPeriodEndDate?: string;
  AuthorizedInvoicesPrefix?: string;
  AuthorizedInvoicesFrom?: string;
  AuthorizedInvoicesTo?: string;
  InvoiceSourceCountryCode?: string;
  InvoiceSourceCountryListAgencyID?: string;
  InvoiceSourceCountryListAgencyName?: string;
  InvoiceSourceCountryListSchemeURI?: string;
  SoftwareProviderID?: string;
  SoftwareProviderSchemeAgencyID?: string;
  SoftwareProviderSchemeAgencyName?: string;
  SoftwareID?: string;
  SoftwareSchemeAgencyID?: string;
  SoftwareSchemeAgencyName?: string;
  SoftwareSecurityCode?: string;
  SoftwareSecuritySchemeAgencyID?: string;
  SoftwareSecuritySchemeAgencyName?: string;
  AuthorizationProviderID?: string;
  AuthorizationProviderSchemeAgencyID?: string;
  AuthorizationProviderSchemeAgencyName?: string;
  AuthorizationProviderSchemeID?: string;
  AuthorizationProviderSchemeName?: string;
  QRCode?: string;
  Signature?: string;


  // AccountingSupplierParty Section (FAJ)
  SupplierAdditionalAccountID?: string;
  SupplierPartyID?: string;
  SupplierPartyName?: string;
  SupplierIndustryClassificationCode?: string;
  SupplierPhysicalLocationID?: string;
  SupplierCityName?: string;
  SupplierPostalZone?: string;
  SupplierCountrySubentity?: string;
  SupplierCountrySubentityCode?: string;
  SupplierLine?: string;
  SupplierCountryCode?: string;
  SupplierCountryName?: string;
  SupplierCountryLanguageID?: string;
  SupplierRegistrationName?: string;
  SupplierTaxLevelCode?: string;
  SupplierTaxLevelCodeListName?: string;
  SupplierTaxSchemeID?: string;
  SupplierTaxSchemeName?: string;
  SupplierCompanyID?: string;
  SupplierCompanyIDSchemeID?: string;
  SupplierCompanyIDSchemeName?: string;
  SupplierCompanyIDSchemeAgencyID?: string;
  SupplierCompanyIDSchemeAgencyName?: string;
  SupplierCorporateRegistrationScheme?: string;
  SupplierContactName?: string;
  SupplierContactTelephone?: string;
  SupplierContactTelefax?: string;
  SupplierContactElectronicMail?: string;
  SupplierContactNote?: string;
  SupplierRegistrationAddressID?: string;
  SupplierRegistrationAddressCityName?: string;
  SupplierRegistrationAddressPostalZone?: string;
  SupplierRegistrationAddressCountrySubentity?: string;
  SupplierRegistrationAddressCountrySubentityCode?: string;
  SupplierRegistrationAddressLine?: string;
  SupplierRegistrationAddressCountryCode?: string;
  SupplierRegistrationAddressCountryName?: string;
  SupplierRegistrationAddressCountryLanguageID?: string;
  SupplierShareholderParticipationPercent?: string;

  // AccountingCustomerParty Section (FAK)
  CustomerAdditionalAccountID?: string;
  CustomerPartyID?: string;
  CustomerPartyIDSchemeName?: string;
  CustomerSchemeID?: string;
  CustomerSchemeName?: string;
  CustomerPhysicalLocationID?: string;
  CustomerCityName?: string;
  CustomerPostalZone?: string;
  CustomerCountrySubentity?: string;
  CustomerCountrySubentityCode?: string;
  CustomerLine?: string;
  CustomerCountryCode?: string;
  CustomerCountryName?: string;
  CustomerCountryLanguageID?: string;
  CustomerRegistrationName?: string;
  CustomerTaxLevelCode?: string;
  CustomerTaxLevelCodeListName?: string;
  CustomerTaxSchemeID?: string;
  CustomerTaxSchemeName?: string;
  CustomerCompanyID?: string;
  CustomerCompanyIDSchemeID?: string;
  CustomerCompanyIDSchemeName?: string;
  CustomerCompanyIDSchemeAgencyID?: string;
  CustomerCompanyIDSchemeAgencyName?: string;
  CustomerSchemeAgencyID?: string;
  CustomerSchemeAgencyName?: string;
  CustomerCorporateRegistrationScheme?: string;
  CustomerContactName?: string;
  CustomerContactTelephone?: string;
  CustomerContactTelefax?: string;
  CustomerContactElectronicMail?: string;
  CustomerContactNote?: string;
  CustomerRegistrationAddressID?: string;
  CustomerRegistrationAddressCityName?: string;
  CustomerRegistrationAddressPostalZone?: string;
  CustomerRegistrationAddressCountrySubentity?: string;
  CustomerRegistrationAddressCountrySubentityCode?: string;
  CustomerRegistrationAddressLine?: string;
  CustomerRegistrationAddressCountryCode?: string;
  CustomerRegistrationAddressCountryName?: string;
  CustomerRegistrationAddressCountryLanguageID?: string;
  CustomerShareholderParticipationPercent?: string;
  CustomerTaxRepresentativeID?: string;
  CustomerTaxRepresentativeIDSchemeID?: string;
  CustomerTaxRepresentativeIDSchemeAgencyID?: string;
  CustomerTaxRepresentativeIDSchemeAgencyName?: string;
  CustomerDeliveryActualDate?: string;
  CustomerDeliveryActualTime?: string;
  CustomerDeliveryAddressID?: string;
  CustomerDeliveryAddressCityName?: string;
  CustomerDeliveryAddressCountrySubentity?: string;
  CustomerDeliveryAddressPostalZone?: string;
  CustomerDeliveryAddressLine?: string;
  CustomerDeliveryAddressCountryCode?: string;

  // InvoiceLine Section
  InvoiceLineID?: string;
  InvoiceLineIDSchemeID?: string;
  InvoiceLineNote?: string;
  InvoiceLineInvoicedQuantity?: string;
  InvoiceLineInvoicedQuantityUnitCode?: string;
  InvoiceLineLineExtensionAmount?: string;
  InvoiceLineLineExtensionAmountCurrencyID?: string;
  InvoiceLineFreeOfChargeIndicator?: string;

  // PricingReference Section
  InvoiceLinePricingReferencePriceAmount?: string;
  InvoiceLinePricingReferencePriceAmountCurrencyID?: string;
  InvoiceLinePricingReferencePriceTypeCode?: string;

  // AllowanceCharge Section
  InvoiceLineAllowanceChargeID?: string;
  InvoiceLineAllowanceChargeChargeIndicator?: string;
  InvoiceLineAllowanceChargeReason?: string;
  InvoiceLineAllowanceChargeMultiplierFactorNumeric?: string;
  InvoiceLineAllowanceChargeAmount?: string;
  InvoiceLineAllowanceChargeAmountCurrencyID?: string;
  InvoiceLineAllowanceChargeBaseAmount?: string;
  InvoiceLineAllowanceChargeBaseAmountCurrencyID?: string;

  // TaxTotal Section
  InvoiceLineTaxTotalTaxAmount?: string;
  InvoiceLineTaxTotalTaxAmountCurrencyID?: string;
  InvoiceLineTaxTotalTaxableAmount?: string;
  InvoiceLineTaxTotalTaxableAmountCurrencyID?: string;
  InvoiceLineTaxTotalPercent?: string;
  InvoiceLineTaxTotalTaxSchemeID?: string;
  InvoiceLineTaxTotalTaxSchemeName?: string;

  // WithholdingTaxTotal Section
  InvoiceLineWithholdingTaxTotalTaxAmount?: string;
  InvoiceLineWithholdingTaxTotalTaxAmountCurrencyID?: string;
  InvoiceLineWithholdingTaxTotalTaxableAmount?: string;
  InvoiceLineWithholdingTaxTotalTaxableAmountCurrencyID?: string;
  InvoiceLineWithholdingTaxTotalPercent?: string;
  InvoiceLineWithholdingTaxTotalTaxSchemeID?: string;
  InvoiceLineWithholdingTaxTotalTaxSchemeName?: string;

  // Item Section
  InvoiceLineItemDescription?: string;
  InvoiceLineItemBuyersItemID?: string;
  InvoiceLineItemSellersItemID?: string;
  InvoiceLineItemStandardItemID?: string;
  InvoiceLineItemStandardItemIDSchemeID?: string;
  InvoiceLineItemStandardItemIDSchemeAgencyID?: string;
  InvoiceLineItemStandardItemIDSchemeName?: string;

  // Price Section
  InvoiceLinePriceAmount?: string;
  InvoiceLinePriceAmountCurrencyID?: string;
  InvoiceLinePriceBaseQuantity?: string;
  InvoiceLinePriceBaseQuantityUnitCode?: string;
}

// Field groupings for different sheets
export const UBLEXTENSIONS_FIELDS = [
  'UBLExtensions',
  'UBLExtension',
  'ExtensionContent',
  'DianExtensions',
  'InvoiceControl',
  'InvoiceAuthorization',
  'AuthorizationPeriodStartDate',
  'AuthorizationPeriodEndDate',
  'AuthorizedInvoicesPrefix',
  'AuthorizedInvoicesFrom',
  'AuthorizedInvoicesTo',
  'InvoiceSourceCountryCode',
  'InvoiceSourceCountryListAgencyID',
  'InvoiceSourceCountryListAgencyName',
  'InvoiceSourceCountryListSchemeURI',
  'SoftwareProviderID',
  'SoftwareProviderSchemeAgencyID',
  'SoftwareProviderSchemeAgencyName',
  'SoftwareID',
  'SoftwareSchemeAgencyID',
  'SoftwareSchemeAgencyName',
  'SoftwareSecurityCode',
  'SoftwareSecuritySchemeAgencyID',
  'SoftwareSecuritySchemeAgencyName',
  'AuthorizationProviderID',
  'AuthorizationProviderSchemeAgencyID',
  'AuthorizationProviderSchemeAgencyName',
  'AuthorizationProviderSchemeID',
  'AuthorizationProviderSchemeName',
  'QRCode',
  'Signature',
  'UBLVersionID',
  'CustomizationID',
];

export const INVOICE_GENERAL_FIELDS = [
  'UBLVersionID',
  'CustomizationID',
  'ProfileID',
  'ProfileExecutionID',
  'AuthorizedInvoicesPrefix',
  'InvoiceID',
  'SupplierCompanyID',
  'SupplierPartyName',
  'CustomerCompanyID',
  'CustomerRegistrationName',
  'UUID',
  'UUIDSchemeID',
  'UUIDSchemeName',
  'IssueDate',
  'IssueTime',
  'DueDate',
  'InvoiceTypeCode',
  'Note',
  'DocumentCurrencyCode',
  'LineCountNumeric',
  'InvoiceTaxTotalTaxAmount',
  'InvoiceTaxTotalTaxAmountCurrencyID',
  'InvoiceWithholdingTaxTotalTaxAmount',
  'InvoiceWithholdingTaxTotalTaxAmountCurrencyID',
  'InvoiceLineExtensionAmount',
  'InvoiceTaxExclusiveAmount',
  'InvoiceTaxInclusiveAmount',
  'InvoiceAllowanceTotalAmount',
  'InvoiceChargeTotalAmount',
  'InvoicePayableRoundingAmount',
  'InvoicePayableAmount',
  'InvoicePayableAmountCurrencyID',
  'InvoicePeriodStartDate',
  'InvoicePeriodStartTime',
  'InvoicePeriodEndDate',
  'InvoicePeriodEndTime',
  'OrderReferenceID',
  'OrderReferenceIssueDate',
  'BillingReferenceID',
  'BillingReferenceUUID',
  'BillingReferenceSchemeName',
  'BillingReferenceIssueDate',
  'DespatchDocumentReferenceID',
  'DespatchDocumentReferenceIssueDate',
  'ReceiptDocumentReferenceID',
  'ReceiptDocumentReferenceIssueDate',
  'AdditionalDocumentReferenceID',
  'AdditionalDocumentReferenceIssueDate',
  'AdditionalDocumentTypeCode',
  'InvoiceActualDeliveryDate',
  'InvoiceActualDeliveryTime',
  'InvoiceDeliveryAddressID',
  'InvoiceDeliveryAddressCityName',
  'InvoiceDeliveryAddressCountrySubentity',
  'InvoiceDeliveryAddressPostalZone',
  'InvoiceDeliveryAddressLine',
  'InvoiceDeliveryAddressCountryCode',
  'InvoiceDeliveryContactName',
  'InvoiceDeliveryContactTelephone',
  'InvoiceDeliveryContactTelefax',
  'InvoiceDeliveryContactElectronicMail',
  'InvoiceDeliveryTermsID',
  'InvoiceDeliveryTermsSpecialTerms',
  'InvoiceDeliveryTermsLossRiskResponsibilityCode',
  'InvoiceDeliveryTermsLossRisk',
  'InvoicePrepaidPaymentID',
  'InvoicePrepaidPaymentPaidAmount',
  'InvoicePrepaidPaymentCurrencyID',
  'InvoicePrepaidPaymentReceivedDate',
  'InvoicePrepaidPaymentPaidDate',
  'InvoicePrepaidPaymentPaidTime',
  'InvoicePrepaidPaymentInstructionID',
  'InvoiceAllowanceChargeID',
  'InvoiceAllowanceChargeChargeIndicator',
  'InvoiceAllowanceChargeReasonCode',
  'InvoiceAllowanceChargeReason',
  'InvoiceAllowanceChargeMultiplierFactorNumeric',
  'InvoiceAllowanceChargeAmount',
  'InvoiceAllowanceChargeAmountCurrencyID',
  'InvoiceAllowanceChargeBaseAmount',
  'InvoiceAllowanceChargeBaseAmountCurrencyID',
  'InvoicePaymentExchangeRateSourceCurrencyCode',
  'InvoicePaymentExchangeRateSourceCurrencyBaseRate',
  'InvoicePaymentExchangeRateTargetCurrencyCode',
  'InvoicePaymentExchangeRateTargetCurrencyBaseRate',
  'InvoicePaymentExchangeRateCalculationRate',
  'InvoicePaymentExchangeRateDate',
  'InvoicePaymentAlternativeExchangeRateSourceCurrencyCode',
  'InvoicePaymentAlternativeExchangeRateSourceCurrencyBaseRate',
  'InvoicePaymentAlternativeExchangeRateTargetCurrencyCode',
  'InvoicePaymentAlternativeExchangeRateTargetCurrencyBaseRate',
  'InvoicePaymentAlternativeExchangeRateCalculationRate',
];

export const ACCOUNTING_SUPPLIER_FIELDS = [
  'SupplierAdditionalAccountID',
  'SupplierPartyID',
  'SupplierPartyName',
  'SupplierIndustryClassificationCode',
  'SupplierPhysicalLocationID',
  'SupplierCityName',
  'SupplierPostalZone',
  'SupplierCountrySubentity',
  'SupplierCountrySubentityCode',
  'SupplierLine',
  'SupplierCountryCode',
  'SupplierCountryName',
  'SupplierCountryLanguageID',
  'SupplierRegistrationName',
  'SupplierTaxLevelCode',
  'SupplierTaxLevelCodeListName',
  'SupplierTaxSchemeID',
  'SupplierTaxSchemeName',
  'SupplierCompanyID',
  'SupplierCompanyIDSchemeID',
  'SupplierCompanyIDSchemeName',
  'SupplierCompanyIDSchemeAgencyID',
  'SupplierCompanyIDSchemeAgencyName',
  'SupplierCorporateRegistrationScheme',
  'SupplierContactName',
  'SupplierContactTelephone',
  'SupplierContactTelefax',
  'SupplierContactElectronicMail',
  'SupplierContactNote',
  'SupplierRegistrationAddressID',
  'SupplierRegistrationAddressCityName',
  'SupplierRegistrationAddressPostalZone',
  'SupplierRegistrationAddressCountrySubentity',
  'SupplierRegistrationAddressCountrySubentityCode',
  'SupplierRegistrationAddressLine',
  'SupplierRegistrationAddressCountryCode',
  'SupplierRegistrationAddressCountryName',
  'SupplierRegistrationAddressCountryLanguageID',
  'SupplierShareholderParticipationPercent',
];

export const ACCOUNTING_CUSTOMER_FIELDS = [
  'CustomerAdditionalAccountID',
  'CustomerPartyID',
  'CustomerPartyIDSchemeName',
  'CustomerSchemeID',
  'CustomerSchemeName',
  'CustomerPhysicalLocationID',
  'CustomerCityName',
  'CustomerPostalZone',
  'CustomerCountrySubentity',
  'CustomerCountrySubentityCode',
  'CustomerLine',
  'CustomerCountryCode',
  'CustomerCountryName',
  'CustomerCountryLanguageID',
  'CustomerRegistrationName',
  'CustomerTaxLevelCode',
  'CustomerTaxLevelCodeListName',
  'CustomerTaxSchemeID',
  'CustomerTaxSchemeName',
  'CustomerCompanyID',
  'CustomerCompanyIDSchemeID',
  'CustomerCompanyIDSchemeName',
  'CustomerCompanyIDSchemeAgencyID',
  'CustomerCompanyIDSchemeAgencyName',
  'CustomerSchemeAgencyID',
  'CustomerSchemeAgencyName',
  'CustomerCorporateRegistrationScheme',
  'CustomerContactName',
  'CustomerContactTelephone',
  'CustomerContactTelefax',
  'CustomerContactElectronicMail',
  'CustomerContactNote',
  'CustomerRegistrationAddressID',
  'CustomerRegistrationAddressCityName',
  'CustomerRegistrationAddressPostalZone',
  'CustomerRegistrationAddressCountrySubentity',
  'CustomerRegistrationAddressCountrySubentityCode',
  'CustomerRegistrationAddressLine',
  'CustomerRegistrationAddressCountryCode',
  'CustomerRegistrationAddressCountryName',
  'CustomerRegistrationAddressCountryLanguageID',
  'CustomerShareholderParticipationPercent',
  'CustomerTaxRepresentativeID',
  'CustomerTaxRepresentativeIDSchemeID',
  'CustomerTaxRepresentativeIDSchemeAgencyID',
  'CustomerTaxRepresentativeIDSchemeAgencyName',
  'CustomerDeliveryActualDate',
  'CustomerDeliveryActualTime',
  'CustomerDeliveryAddressID',
  'CustomerDeliveryAddressCityName',
  'CustomerDeliveryAddressCountrySubentity',
  'CustomerDeliveryAddressPostalZone',
  'CustomerDeliveryAddressLine',
  'CustomerDeliveryAddressCountryCode',
];

export const INVOICE_LINES = [
  // InvoiceLine Section
  'InvoiceLineID',
  'InvoiceLineItemDescription',
  'InvoiceLineInvoicedQuantity',
  'InvoiceLineIDSchemeID',
  'InvoiceLineNote',
  'InvoiceLineInvoicedQuantityUnitCode',
  'InvoiceLineLineExtensionAmount',
  'InvoiceLineLineExtensionAmountCurrencyID',
  'InvoiceLineFreeOfChargeIndicator',

  // Item Section
  'InvoiceLineItemBuyersItemID',
  'InvoiceLineItemSellersItemID',
  'InvoiceLineItemStandardItemID',
  'InvoiceLineItemStandardItemIDSchemeID',
  'InvoiceLineItemStandardItemIDSchemeAgencyID',
  'InvoiceLineItemStandardItemIDSchemeName',

  // TaxTotal Section
  'InvoiceLineTaxTotalTaxAmount',
  'InvoiceLineTaxTotalTaxAmountCurrencyID',
  'InvoiceLineTaxTotalTaxableAmount',
  'InvoiceLineTaxTotalTaxableAmountCurrencyID',
  'InvoiceLineTaxTotalPercent',
  'InvoiceLineTaxTotalTaxSchemeID',
  'InvoiceLineTaxTotalTaxSchemeName',

  // Price Section
  'InvoiceLinePriceAmount',
  'InvoiceLinePriceAmountCurrencyID',
  'InvoiceLinePriceBaseQuantity',
  'InvoiceLinePriceBaseQuantityUnitCode',

  // PricingReference Section
  'InvoiceLinePricingReferencePriceAmount',
  'InvoiceLinePricingReferencePriceAmountCurrencyID',
  'InvoiceLinePricingReferencePriceTypeCode',

  // AllowanceCharge Section
  'InvoiceLineAllowanceChargeID',
  'InvoiceLineAllowanceChargeChargeIndicator',
  'InvoiceLineAllowanceChargeReason',
  'InvoiceLineAllowanceChargeMultiplierFactorNumeric',
  'InvoiceLineAllowanceChargeAmount',
  'InvoiceLineAllowanceChargeAmountCurrencyID',
  'InvoiceLineAllowanceChargeBaseAmount',
  'InvoiceLineAllowanceChargeBaseAmountCurrencyID',

  // WithholdingTaxTotal Section
  'InvoiceLineWithholdingTaxTotalTaxAmount',
  'InvoiceLineWithholdingTaxTotalTaxAmountCurrencyID',
  'InvoiceLineWithholdingTaxTotalTaxableAmount',
  'InvoiceLineWithholdingTaxTotalTaxableAmountCurrencyID',
  'InvoiceLineWithholdingTaxTotalPercent',
  'InvoiceLineWithholdingTaxTotalTaxSchemeID',
  'InvoiceLineWithholdingTaxTotalTaxSchemeName',
];

// XML mappings
export const XML_MAPPINGS: { [key: string]: string } = {
  // General Invoice Fields
  UBLVersionID: './cbc:UBLVersionID',
  CustomizationID: './cbc:CustomizationID',
  ProfileID: './cbc:ProfileID',
  ProfileExecutionID: './cbc:ProfileExecutionID',
  InvoiceID: './cbc:ID',
  UUID: './cbc:UUID',
  UUID_schemeID: './cbc:UUID/@schemeID',
  UUID_schemeName: './cbc:UUID/@schemeName',
  IssueDate: './cbc:IssueDate',
  IssueTime: './cbc:IssueTime',
  DueDate: './cbc:DueDate',
  InvoiceTypeCode: './cbc:InvoiceTypeCode',
  Note: './cbc:Note',
  DocumentCurrencyCode: './cbc:DocumentCurrencyCode',
  LineCountNumeric: './cbc:LineCountNumeric',
  // Tax Representative Party Section
  InvoiceTaxRepresentativeID:
    './/cac:TaxRepresentativeParty/cac:PartyIdentification/cbc:ID',
  InvoiceTaxRepresentativeIDSchemeID:
    './/cac:TaxRepresentativeParty/cac:PartyIdentification/cbc:ID/@schemeID',
  InvoiceTaxRepresentativeIDSchemeAgencyID:
    './/cac:TaxRepresentativeParty/cac:PartyIdentification/cbc:ID/@schemeAgencyID',
  InvoiceTaxRepresentativeIDSchemeAgencyName:
    './/cac:TaxRepresentativeParty/cac:PartyIdentification/cbc:ID/@schemeAgencyName',

  // Delivery Section
  InvoiceActualDeliveryDate: './/cac:Delivery/cbc:ActualDeliveryDate',
  InvoiceActualDeliveryTime: './/cac:Delivery/cbc:ActualDeliveryTime',
  InvoiceDeliveryAddressID: './/cac:Delivery/cac:DeliveryAddress/cbc:ID',
  InvoiceDeliveryAddressCityName:
    './/cac:Delivery/cac:DeliveryAddress/cbc:CityName',
  InvoiceDeliveryAddressCountrySubentity:
    './/cac:Delivery/cac:DeliveryAddress/cbc:CountrySubentity',
  InvoiceDeliveryAddressPostalZone:
    './/cac:Delivery/cac:DeliveryAddress/cbc:PostalZone',
  InvoiceDeliveryAddressLine:
    './/cac:Delivery/cac:DeliveryAddress/cac:AddressLine/cbc:Line',
  InvoiceDeliveryAddressCountryCode:
    './/cac:Delivery/cac:DeliveryAddress/cac:Country/cbc:IdentificationCode',
  InvoiceDeliveryContactName:
    './/cac:Delivery/cac:DeliveryParty/cac:Contact/cbc:Name',
  InvoiceDeliveryContactTelephone:
    './/cac:Delivery/cac:DeliveryParty/cac:Contact/cbc:Telephone',
  InvoiceDeliveryContactTelefax:
    './/cac:Delivery/cac:DeliveryParty/cac:Contact/cbc:Telefax',
  InvoiceDeliveryContactElectronicMail:
    './/cac:Delivery/cac:DeliveryParty/cac:Contact/cbc:ElectronicMail',

  // DeliveryTerms Section
  InvoiceDeliveryTermsID: './/cac:DeliveryTerms/cbc:ID',
  InvoiceDeliveryTermsSpecialTerms: './/cac:DeliveryTerms/cbc:SpecialTerms',
  InvoiceDeliveryTermsLossRiskResponsibilityCode:
    './/cac:DeliveryTerms/cbc:LossRiskResponsibilityCode',
  InvoiceDeliveryTermsLossRisk: './/cac:DeliveryTerms/cbc:LossRisk',

  // PrepaidPayment Section
  InvoicePrepaidPaymentID: './/cac:PrepaidPayment/cbc:ID',
  InvoicePrepaidPaymentPaidAmount: './/cac:PrepaidPayment/cbc:PaidAmount',
  InvoicePrepaidPaymentCurrencyID:
    './/cac:PrepaidPayment/cbc:PaidAmount/@currencyID',
  InvoicePrepaidPaymentReceivedDate: './/cac:PrepaidPayment/cbc:ReceivedDate',
  InvoicePrepaidPaymentPaidDate: './/cac:PrepaidPayment/cbc:PaidDate',
  InvoicePrepaidPaymentPaidTime: './/cac:PrepaidPayment/cbc:PaidTime',
  InvoicePrepaidPaymentInstructionID: './/cac:PrepaidPayment/cbc:InstructionID',

  // AllowanceCharge Section
  InvoiceAllowanceChargeID: './/cac:AllowanceCharge/cbc:ID',
  InvoiceAllowanceChargeChargeIndicator:
    './/cac:AllowanceCharge/cbc:ChargeIndicator',
  InvoiceAllowanceChargeReasonCode:
    './/cac:AllowanceCharge/cbc:AllowanceChargeReasonCode',
  InvoiceAllowanceChargeReason:
    './/cac:AllowanceCharge/cbc:AllowanceChargeReason',
  InvoiceAllowanceChargeMultiplierFactorNumeric:
    './/cac:AllowanceCharge/cbc:MultiplierFactorNumeric',
  InvoiceAllowanceChargeAmount: './/cac:AllowanceCharge/cbc:Amount',
  InvoiceAllowanceChargeAmountCurrencyID:
    './/cac:AllowanceCharge/cbc:Amount/@currencyID',
  InvoiceAllowanceChargeBaseAmount: './/cac:AllowanceCharge/cbc:BaseAmount',
  InvoiceAllowanceChargeBaseAmountCurrencyID:
    './/cac:AllowanceCharge/cbc:BaseAmount/@currencyID',

  // PaymentExchangeRate Section
  InvoicePaymentExchangeRateSourceCurrencyCode:
    './/cac:PaymentExchangeRate/cbc:SourceCurrencyCode',
  InvoicePaymentExchangeRateSourceCurrencyBaseRate:
    './/cac:PaymentExchangeRate/cbc:SourceCurrencyBaseRate',
  InvoicePaymentExchangeRateTargetCurrencyCode:
    './/cac:PaymentExchangeRate/cbc:TargetCurrencyCode',
  InvoicePaymentExchangeRateTargetCurrencyBaseRate:
    './/cac:PaymentExchangeRate/cbc:TargetCurrencyBaseRate',
  InvoicePaymentExchangeRateCalculationRate:
    './/cac:PaymentExchangeRate/cbc:CalculationRate',
  InvoicePaymentExchangeRateDate: './/cac:PaymentExchangeRate/cbc:Date',

  // PaymentAlternativeExchangeRate Section
  InvoicePaymentAlternativeExchangeRateSourceCurrencyCode:
    './/cac:PaymentAlternativeExchangeRate/cbc:SourceCurrencyCode',
  InvoicePaymentAlternativeExchangeRateSourceCurrencyBaseRate:
    './/cac:PaymentAlternativeExchangeRate/cbc:SourceCurrencyBaseRate',
  InvoicePaymentAlternativeExchangeRateTargetCurrencyCode:
    './/cac:PaymentAlternativeExchangeRate/cbc:TargetCurrencyCode',
  InvoicePaymentAlternativeExchangeRateTargetCurrencyBaseRate:
    './/cac:PaymentAlternativeExchangeRate/cbc:TargetCurrencyBaseRate',
  InvoicePaymentAlternativeExchangeRateCalculationRate:
    './/cac:PaymentAlternativeExchangeRate/cbc:CalculationRate',

  // TaxTotal Section
  InvoiceTaxTotalTaxAmount: './/cac:TaxTotal/cbc:TaxAmount',
  InvoiceTaxTotalTaxAmountCurrencyID:
    './/cac:TaxTotal/cbc:TaxAmount/@currencyID',

  // WithholdingTaxTotal Section
  InvoiceWithholdingTaxTotalTaxAmount:
    './/cac:WithholdingTaxTotal/cbc:TaxAmount',
  InvoiceWithholdingTaxTotalTaxAmountCurrencyID:
    './/cac:WithholdingTaxTotal/cbc:TaxAmount/@currencyID',

  // LegalMonetaryTotal Section
  InvoiceLineExtensionAmount:
    './/cac:LegalMonetaryTotal/cbc:LineExtensionAmount',
  InvoiceTaxExclusiveAmount: './/cac:LegalMonetaryTotal/cbc:TaxExclusiveAmount',
  InvoiceTaxInclusiveAmount: './/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount',
  InvoiceAllowanceTotalAmount:
    './/cac:LegalMonetaryTotal/cbc:AllowanceTotalAmount',
  InvoiceChargeTotalAmount: './/cac:LegalMonetaryTotal/cbc:ChargeTotalAmount',
  InvoicePrepaidAmount: './/cac:LegalMonetaryTotal/cbc:PrepaidAmount',
  InvoicePrepaidAmountCurrencyID:
    './/cac:LegalMonetaryTotal/cbc:PrepaidAmount/@currencyID',
  InvoicePayableRoundingAmount:
    './/cac:LegalMonetaryTotal/cbc:PayableRoundingAmount',
  InvoicePayableAmount: './/cac:LegalMonetaryTotal/cbc:PayableAmount',
  InvoicePayableAmountCurrencyID:
    './/cac:LegalMonetaryTotal/cbc:PayableAmount/@currencyID',

  // UBLExtensions Fields
  UBLExtensions: './/ext:UBLExtensions',
  UBLExtension: './/ext:UBLExtensions/ext:UBLExtension',
  ExtensionContent:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent',

  // UBLExtensions Dian Extensions
  DianExtensions:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions',
  InvoiceControl:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:InvoiceControl',
  InvoiceAuthorization:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:InvoiceControl/sts:InvoiceAuthorization',
  AuthorizationPeriodStartDate:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:InvoiceControl/sts:AuthorizationPeriod/cbc:StartDate',
  AuthorizationPeriodEndDate:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:InvoiceControl/sts:AuthorizationPeriod/cbc:EndDate',
  AuthorizedInvoicesPrefix:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:InvoiceControl/sts:AuthorizedInvoices/sts:Prefix',
  AuthorizedInvoicesFrom:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:InvoiceControl/sts:AuthorizedInvoices/sts:From',
  AuthorizedInvoicesTo:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:InvoiceControl/sts:AuthorizedInvoices/sts:To',

  // UBLExtensions Invoice Source
  InvoiceSourceCountryCode:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:InvoiceSource/cbc:IdentificationCode',
  InvoiceSourceCountryListAgencyID:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:InvoiceSource/cbc:IdentificationCode/@listAgencyID',
  InvoiceSourceCountryListAgencyName:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:InvoiceSource/cbc:IdentificationCode/@listAgencyName',
  InvoiceSourceCountryListSchemeURI:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:InvoiceSource/cbc:IdentificationCode/@listSchemeURI',

  // UBLExtensions Software Provider
  SoftwareProviderID:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:SoftwareProvider/sts:ProviderID',
  SoftwareProviderSchemeAgencyID:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:SoftwareProvider/sts:ProviderID/@schemeAgencyID',
  SoftwareProviderSchemeAgencyName:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:SoftwareProvider/sts:ProviderID/@schemeAgencyName',
  SoftwareID:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:SoftwareProvider/sts:softwareID',
  SoftwareSchemeAgencyID:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:SoftwareProvider/sts:softwareID/@schemeAgencyID',
  SoftwareSchemeAgencyName:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:SoftwareProvider/sts:softwareID/@schemeAgencyName',
  SoftwareSecurityCode:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:SoftwareSecurityCode',
  SoftwareSecuritySchemeAgencyID:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:SoftwareSecurityCode/@schemeAgencyID',
  SoftwareSecuritySchemeAgencyName:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:SoftwareSecurityCode/@schemeAgencyName',

  // UBLExtensions Authorization Provider
  AuthorizationProviderID:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:AuthorizationProvider/sts:AuthorizationProviderID',
  AuthorizationProviderSchemeAgencyID:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:AuthorizationProvider/sts:AuthorizationProviderID/@schemeAgencyID',
  AuthorizationProviderSchemeAgencyName:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:AuthorizationProvider/sts:AuthorizationProviderID/@schemeAgencyName',
  AuthorizationProviderSchemeID:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:AuthorizationProvider/sts:AuthorizationProviderID/@schemeID',
  AuthorizationProviderSchemeName:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:AuthorizationProvider/sts:AuthorizationProviderID/@schemeName',

  // UBLExtensions QR Code and Signature
  QRCode:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/sts:DianExtensions/sts:QRCode',
  Signature:
    './/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/ds:Signature',



  // AccountingSupplierParty mappings
  SupplierAdditionalAccountID:
    './/cac:AccountingSupplierParty/cbc:AdditionalAccountID',
  SupplierPartyID:
    './/cac:AccountingSupplierParty/cac:Party/cac:PartyIdentification/cbc:ID',
  SupplierPartyName:
    './/cac:AccountingSupplierParty/cac:Party/cac:PartyName/cbc:Name',
  SupplierIndustryClassificationCode:
    './/cac:AccountingSupplierParty/cac:Party/cbc:IndustryClassificationCode',
  SupplierPhysicalLocationID:
    './/cac:AccountingSupplierParty/cac:Party/cac:PhysicalLocation/cac:Address/cbc:ID',
  SupplierCityName:
    './/cac:AccountingSupplierParty/cac:Party/cac:PhysicalLocation/cac:Address/cbc:CityName',
  SupplierPostalZone:
    './/cac:AccountingSupplierParty/cac:Party/cac:PhysicalLocation/cac:Address/cbc:PostalZone',
  SupplierCountrySubentity:
    './/cac:AccountingSupplierParty/cac:Party/cac:PhysicalLocation/cac:Address/cbc:CountrySubentity',
  SupplierCountrySubentityCode:
    './/cac:AccountingSupplierParty/cac:Party/cac:PhysicalLocation/cac:Address/cbc:CountrySubentityCode',
  SupplierLine:
    './/cac:AccountingSupplierParty/cac:Party/cac:PhysicalLocation/cac:Address/cac:AddressLine/cbc:Line',
  SupplierCountryCode:
    './/cac:AccountingSupplierParty/cac:Party/cac:PhysicalLocation/cac:Address/cac:Country/cbc:IdentificationCode',
  SupplierCountryName:
    './/cac:AccountingSupplierParty/cac:Party/cac:PhysicalLocation/cac:Address/cac:Country/cbc:Name',
  SupplierCountryLanguageID:
    './/cac:AccountingSupplierParty/cac:Party/cac:PhysicalLocation/cac:Address/cac:Country/cbc:Name/@languageID',

  // AccountingSupplierParty Tax Information
  SupplierRegistrationName:
    './/cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cbc:RegistrationName',
  SupplierTaxLevelCode:
    './/cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cbc:TaxLevelCode',
  SupplierTaxLevelCodeListName:
    './/cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cbc:TaxLevelCode/@listName',
  SupplierTaxSchemeID:
    './/cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cac:TaxScheme/cbc:ID',
  SupplierTaxSchemeName:
    './/cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cac:TaxScheme/cbc:Name',

  // AccountingSupplierParty Legal Entity Information
  SupplierCompanyID:
    './/cac:AccountingSupplierParty/cac:Party/cac:PartyLegalEntity/cbc:CompanyID',
  SupplierCompanyIDSchemeID:
    './/cac:AccountingSupplierParty/cac:Party/cac:PartyLegalEntity/cbc:CompanyID/@schemeID',
  SupplierCompanyIDSchemeName:
    './/cac:AccountingSupplierParty/cac:Party/cac:PartyLegalEntity/cbc:CompanyID/@schemeName',
  SupplierCompanyIDSchemeAgencyID:
    './/cac:AccountingSupplierParty/cac:Party/cac:PartyLegalEntity/cbc:CompanyID/@schemeAgencyID',
  SupplierCompanyIDSchemeAgencyName:
    './/cac:AccountingSupplierParty/cac:Party/cac:PartyLegalEntity/cbc:CompanyID/@schemeAgencyName',

  // AccountingSupplierParty Contact Information
  SupplierContactName:
    './/cac:AccountingSupplierParty/cac:Party/cac:Contact/cbc:Name',
  SupplierContactTelephone:
    './/cac:AccountingSupplierParty/cac:Party/cac:Contact/cbc:Telephone',
  SupplierContactTelefax:
    './/cac:AccountingSupplierParty/cac:Party/cac:Contact/cbc:Telefax',
  SupplierContactElectronicMail:
    './/cac:AccountingSupplierParty/cac:Party/cac:Contact/cbc:ElectronicMail',

  // AccountingSupplierParty Registration Address
  SupplierRegistrationAddressID:
    './/cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cac:RegistrationAddress/cbc:ID',
  SupplierRegistrationAddressCityName:
    './/cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cac:RegistrationAddress/cbc:CityName',
  SupplierRegistrationAddressPostalZone:
    './/cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cac:RegistrationAddress/cbc:PostalZone',
  SupplierShareholderParticipationPercent:
    './/cac:AccountingSupplierParty/cac:Party/cac:PartyLegalEntity/cac:ShareholderParty/cbc:PartecipationPercent',

  // AccountingCustomerParty mappings
  CustomerAdditionalAccountID:
    './/cac:AccountingCustomerParty/cbc:AdditionalAccountID',
  CustomerPartyID:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID',
  CustomerPartyIDSchemeName:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID/@schemeName',
  CustomerSchemeID:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:CompanyID/@schemeID',
  CustomerSchemeName:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:CompanyID/@schemeName',
  CustomerPhysicalLocationID:
    './/cac:AccountingCustomerParty/cac:Party/cac:PhysicalLocation/cac:Address/cbc:ID',
  CustomerCityName:
    './/cac:AccountingCustomerParty/cac:Party/cac:PhysicalLocation/cac:Address/cbc:CityName',
  CustomerPostalZone:
    './/cac:AccountingCustomerParty/cac:Party/cac:PhysicalLocation/cac:Address/cbc:PostalZone',
  CustomerCountrySubentity:
    './/cac:AccountingCustomerParty/cac:Party/cac:PhysicalLocation/cac:Address/cbc:CountrySubentity',
  CustomerCountrySubentityCode:
    './/cac:AccountingCustomerParty/cac:Party/cac:PhysicalLocation/cac:Address/cbc:CountrySubentityCode',
  CustomerLine:
    './/cac:AccountingCustomerParty/cac:Party/cac:PhysicalLocation/cac:Address/cac:AddressLine/cbc:Line',
  CustomerCountryCode:
    './/cac:AccountingCustomerParty/cac:Party/cac:PhysicalLocation/cac:Address/cac:Country/cbc:IdentificationCode',
  CustomerCountryName:
    './/cac:AccountingCustomerParty/cac:Party/cac:PhysicalLocation/cac:Address/cac:Country/cbc:Name',
  CustomerCountryLanguageID:
    './/cac:AccountingCustomerParty/cac:Party/cac:PhysicalLocation/cac:Address/cac:Country/cbc:Name/@languageID',

  // Tax Information
  CustomerRegistrationName:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cbc:RegistrationName',
  CustomerTaxLevelCode:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cbc:TaxLevelCode',
  CustomerTaxLevelCodeListName:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cbc:TaxLevelCode/@listName',
  CustomerTaxSchemeID:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cac:TaxScheme/cbc:ID',
  CustomerTaxSchemeName:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cac:TaxScheme/cbc:Name',

  // Legal Entity Information
  CustomerCompanyID:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:CompanyID',
  CustomerCompanyIDSchemeID:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:CompanyID/@schemeID',
  CustomerCompanyIDSchemeName:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:CompanyID/@schemeName',
  CustomerCompanyIDSchemeAgencyID:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:CompanyID/@schemeAgencyID',
  CustomerCompanyIDSchemeAgencyName:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:CompanyID/@schemeAgencyName',

  // Contact Information
  CustomerContactName:
    './/cac:AccountingCustomerParty/cac:Party/cac:Contact/cbc:Name',
  CustomerContactTelephone:
    './/cac:AccountingCustomerParty/cac:Party/cac:Contact/cbc:Telephone',
  CustomerContactTelefax:
    './/cac:AccountingCustomerParty/cac:Party/cac:Contact/cbc:Telefax',
  CustomerContactElectronicMail:
    './/cac:AccountingCustomerParty/cac:Party/cac:Contact/cbc:ElectronicMail',
  CustomerContactNote:
    './/cac:AccountingCustomerParty/cac:Party/cac:Contact/cbc:Note',

  // Registration Address
  CustomerRegistrationAddressID:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cac:RegistrationAddress/cbc:ID',
  CustomerRegistrationAddressCityName:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cac:RegistrationAddress/cbc:CityName',
  CustomerRegistrationAddressPostalZone:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cac:RegistrationAddress/cbc:PostalZone',
  CustomerRegistrationAddressCountrySubentity:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cac:RegistrationAddress/cbc:CountrySubentity',
  CustomerRegistrationAddressCountrySubentityCode:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cac:RegistrationAddress/cbc:CountrySubentityCode',
  CustomerRegistrationAddressLine:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cac:RegistrationAddress/cac:AddressLine/cbc:Line',
  CustomerRegistrationAddressCountryCode:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cac:RegistrationAddress/cac:Country/cbc:IdentificationCode',
  CustomerRegistrationAddressCountryName:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cac:RegistrationAddress/cac:Country/cbc:Name',
  CustomerRegistrationAddressCountryLanguageID:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cac:RegistrationAddress/cac:Country/cbc:Name/@languageID',

  // Shareholder Participation
  CustomerShareholderParticipationPercent:
    './/cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cac:ShareholderParty/cbc:PartecipationPercent',

  // Tax Representative
  CustomerTaxRepresentativeID:
    './/cac:AccountingCustomerParty/cac:Party/cac:TaxRepresentativeParty/cac:PartyIdentification/cbc:ID',
  CustomerTaxRepresentativeIDSchemeID:
    './/cac:AccountingCustomerParty/cac:Party/cac:TaxRepresentativeParty/cac:PartyIdentification/cbc:ID/@schemeID',
  CustomerTaxRepresentativeIDSchemeAgencyID:
    './/cac:AccountingCustomerParty/cac:Party/cac:TaxRepresentativeParty/cac:PartyIdentification/cbc:ID/@schemeAgencyID',
  CustomerTaxRepresentativeIDSchemeAgencyName:
    './/cac:AccountingCustomerParty/cac:Party/cac:TaxRepresentativeParty/cac:PartyIdentification/cbc:ID/@schemeAgencyName',

  // Delivery Address
  CustomerDeliveryActualDate:
    './/cac:AccountingCustomerParty/cac:Party/cac:Delivery/cbc:ActualDeliveryDate',
  CustomerDeliveryActualTime:
    './/cac:AccountingCustomerParty/cac:Party/cac:Delivery/cbc:ActualDeliveryTime',
  CustomerDeliveryAddressID:
    './/cac:AccountingCustomerParty/cac:Party/cac:Delivery/cac:DeliveryAddress/cbc:ID',
  CustomerDeliveryAddressCityName:
    './/cac:AccountingCustomerParty/cac:Party/cac:Delivery/cac:DeliveryAddress/cbc:CityName',
  CustomerDeliveryAddressCountrySubentity:
    './/cac:AccountingCustomerParty/cac:Party/cac:Delivery/cac:DeliveryAddress/cbc:CountrySubentity',
  CustomerDeliveryAddressPostalZone:
    './/cac:AccountingCustomerParty/cac:Party/cac:Delivery/cac:DeliveryAddress/cbc:PostalZone',
  CustomerDeliveryAddressLine:
    './/cac:AccountingCustomerParty/cac:Party/cac:Delivery/cac:DeliveryAddress/cac:AddressLine/cbc:Line',
  CustomerDeliveryAddressCountryCode:
    './/cac:AccountingCustomerParty/cac:Party/cac:Delivery/cac:DeliveryAddress/cac:Country/cbc:IdentificationCode',
};
