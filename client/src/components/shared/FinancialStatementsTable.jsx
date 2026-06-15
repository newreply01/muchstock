import React from 'react';

const FINANCIAL_ITEM_TRANSLATIONS = {
    // Balance Sheet - Assets
    'TotalAssets': '資產總計',
    'CurrentAssets': '流動資產',
    'NoncurrentAssets': '非流動資產',
    'CashAndCashEquivalents': '現金及約當現金',
    'AccountsReceivable': '應收帳款',
    'AccountsReceivableNet': '應收帳款淨額',
    'Inventory': '存貨',
    'Inventories': '存貨',
    'PropertyPlantAndEquipment': '不動產、廠房及設備',
    'OtherCurrentAssets': '其他流動資產',
    'OtherNoncurrentAssets': '其他非流動資產',
    'RightOfUseAsset': '使用權資產',
    'IntangibleAssets': '無形資產',
    'DeferredTaxAssets': '遞延所得稅資產',
    'InvestmentAccountedForUsingEquityMethod': '採用權益法之投資',

    // Balance Sheet - Financial Assets
    'FinancialAssetsAtAmortizedCost': '按攤銷後成本衡量之金融資產',
    'FinancialAssetsAtAmortizedCostNonCurrent': '按攤銷後成本衡量之金融資產-非流動',
    'FinancialAssetsAtFairvalueThroughOtherComprehensiveIncome': '透過其他綜合損益按公允價值衡量之金融資產',
    'FinancialAssetsAtFairvalueThroughOtherComprehensiveIncomeNonCurrent': '透過其他綜合損益按公允價值衡量之金融資產－非流動',
    'CurrentFinancialAssetsAtFairvalueThroughProfitOrLoss': '透過損益按公允價值衡量之金融資產－流動',
    'NonCurrentFinancialAssetsAtFairvalueThroughProfitOrLoss': '透過損益按公允價值衡量之金融資產－非流動',
    'HedgingAinancialAssets': '避險之金融資產',

    // Balance Sheet - Liabilities
    'Liabilities': '負債',
    'TotalLiabilities': '負債總計',
    'CurrentLiabilities': '流動負債',
    'NoncurrentLiabilities': '非流動負債',
    'ShortTermBorrowings': '短期借款',
    'LongTermBorrowings': '長期借款',
    'LongtermBorrowings': '長期借款',
    'BondsPayable': '應付公司債',
    'AccountsPayable': '應付帳款',
    'OtherPayables': '其他應付款',
    'CurrentTaxLiabilities': '當期所得稅負債',
    'OtherCurrentLiabilities': '其他流動負債',
    'OtherNoncurrentLiabilities': '其他非流動負債',
    'TotalLiabilitiesEquity': '負債及權益總計',
    'CurrentFinancialLiabilitiesAtFairValueThroughProfitOrLoss': '透過損益按公允價值衡量之金融負債－流動',

    // Balance Sheet - Equity
    'Equity': '權益',
    'TotalEquity': '權益總計',
    'EquityAttributableToOwnersOfParent': '歸屬於母公司業主之權益',
    'NoncontrollingInterests': '非控制權益',
    'CapitalStock': '股本',
    'OrdinaryShares': '普通股股本',
    'OrdinaryShare': '普通股股本',
    'RetainedEarnings': '保留盈餘',
    'LegalReserve': '法定盈餘公積',
    'CapitalSurplus': '資本公積',
    'CapitalSurplusAdditionalPaidInCapital': '資本公積－發行溢價',
    'CapitalSurplusChangesInEquityOfAssociatesAndJointVenturesAccountedForUsingEquityMethod': '資本公積－採用權益法認列關聯企業及合資股權淨值之變動數',
    'CapitalSurplusDonatedAssetsReceived': '資本公積－受領贈與',
    'CapitalSurplusNetAssetsFromMerger': '資本公積－合併溢額',
    'UnappropriatedRetainedEarningsAaccumulatedDeficit': '未分配盈餘（或待彌補虧損）',
    'OtherEquityInterest': '其他權益',
    'NumberOfSharesInEntityHeldByEntityAndByItsSubsidiaries': '母公司暨子公司所持有之庫藏股股數',

    // Additional typical items & Related Parties
    'OtherReceivablesDueFromRelatedParties': '應收關係人款項',
    'AccountsReceivableDuefromRelatedPartiesNet': '應收關係人款項淨額',
    'AccountsPayableToRelatedParties': '應付關係人款項',
    'CurrentDerivativeFinancialLiabilitiesForHedging': '避險之衍生性金融負債-流動',

    // Cash Flows
    'NetCashFlowsFromOperatingActivities': '營業活動之淨現金流入（流出）',
    'NetCashFlowsFromInvestingActivities': '投資活動之淨現金流入（流出）',
    'NetCashFlowsFromFinancingActivities': '籌資活動之淨現金流入（流出）',
    'NetIncreaseDecreaseInCashAndCashEquivalents': '本期現金及約當現金增加（減少）數',
    'CashAndCashEquivalentsAtEndOfPeriod': '期末現金及約當現金餘額',
    'CashAndCashEquivalentsAtBeginningOfPeriod': '期初現金及約當現金餘額',
    'DepreciationExpense': '折舊費用',
    'AmortizationExpense': '攤銷費用',
    'InterestExpense': '利息費用',
    'InterestIncome': '利息收入'
};

const translateAccount = (account) => {
    if (typeof account !== 'string') return account;
    const isPercentage = account.endsWith('_per');
    const baseName = isPercentage ? account.replace('_per', '') : account;
    const translated = FINANCIAL_ITEM_TRANSLATIONS[baseName];

    if (translated) {
        return isPercentage ? `${translated} (%)` : translated;
    }
    return account;
};

export default function FinancialStatementsTable({ data, title, type }) {
    if (!data || data.length === 0) {
        return (
            <div className="p-12 text-center text-slate-400 italic bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                暫無 {title} 數據
            </div>
        );
    }

    // Sort by date descending
    const sortedData = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Group unique items (accounts)
    const accounts = Array.from(new Set(sortedData.map(d => d.item)));
    const dates = Array.from(new Set(sortedData.map(d => d.date))).sort((a, b) => new Date(b) - new Date(a));

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                        <tr className="bg-slate-50/30 border-b border-slate-100 dark:border-slate-800">
                            <th className="px-6 py-4 font-bold text-slate-600 sticky left-0 bg-slate-50/30 z-10 backdrop-blur-sm">項目 \ 日期</th>
                            {dates.map(date => (
                                <th key={date} className="px-6 py-4 font-bold text-slate-600">
                                    {new Date(date).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit' })}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {accounts.map(account => (
                            <tr key={account} className="hover:bg-slate-50 dark:bg-slate-800 transition-colors group">
                                <td className="px-6 py-3.5 font-bold text-slate-700 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:bg-slate-800 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                    {translateAccount(account)}
                                </td>
                                {dates.map(date => {
                                    const entry = sortedData.find(d => d.date === date && d.item === account);
                                    const value = entry ? parseFloat(entry.value) : null;
                                    return (
                                        <td key={`${date}-${account}`} className="px-6 py-3.5 font-medium text-slate-600">
                                            {value !== null ? (value / 1000000).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '--'}
                                            {value !== null && <span className="text-[10px] text-slate-400 ml-1">M</span>}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-6 py-3 bg-slate-50/50 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-right">
                單位：百萬元 (Millions TWD)
            </div>
        </div>
    );
}
