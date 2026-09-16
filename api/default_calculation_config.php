<?php
declare(strict_types=1);

return [
    'id' => 'default-mnt-excel',
    'versionId' => null,
    'name' => 'MNT расчёт по Excel',
    'variables' => [
        'vanningYen' => ['label' => 'Vanning, ¥', 'value' => 40000],
        'usdTrainContainer' => ['label' => 'Контейнер Train, $', 'value' => 1200],
        'usdTrackContainer' => ['label' => 'Контейнер Track, $', 'value' => 1200],
        'mongoliaDocsUsd' => ['label' => 'Документы в Монголии, $', 'value' => 440],
        'borderSupportUsd' => ['label' => 'Сопровождение границы, $', 'value' => 200],
        'trainCarrierUsd' => ['label' => 'Автовоз УБ - СБ, $', 'value' => 200],
        'trackCarrierUsd' => ['label' => 'Автовоз Замын-Ууд - СБ, $', 'value' => 500],
        'rubInInvoice' => ['label' => 'Таможенная очистка, ₽', 'value' => 47800],
        'japanFixedMnt' => ['label' => 'Фиксированная комиссия к Японии, ₮', 'value' => 15000],
        'agentFixedMnt' => ['label' => 'Комиссия посредника, ₮', 'value' => 550000],
        'jpyMntRiskMarkup' => ['label' => 'Риск к курсу ¥/₮', 'value' => 0.6],
        'mntPerRub' => ['label' => '₮ за 1 ₽', 'value' => 47.8],
        'labRub' => ['label' => 'Лаборатория, ₽', 'value' => 40000],
    ],
    'resultRows' => [
        'japanMntTotal' => [
            'label' => 'Расходы по Японии, ₮',
            'description' => '',
        ],
        'deliveryMnt' => [
            'label' => 'Расходы до Монголии, ₮',
            'description' => '',
        ],
        'rubInvoiceMntEquivalent' => [
            'label' => 'Таможенная очистка в инвойсе, ₮',
            'description' => '',
        ],
        'invoiceMnt' => [
            'label' => 'Инвойс с комиссией посредника, ₮',
            'description' => '',
        ],
        'invoiceRub' => [
            'label' => 'Оплата по инвойсу в рублях с комиссией посредника, ₽',
            'description' => '',
        ],
        'customs' => [
            'label' => 'Таможенный платёж, пошлина и утилизационный сбор, ₽',
            'description' => '',
        ],
        'lab' => [
            'label' => 'ЭПТС и СБКТС, ₽',
            'description' => 'Гибридные авто обязательны к прохождению лаборатории в г. Кяхта.',
        ],
        'grandTotal' => [
            'label' => 'Итоговая сумма, ₽',
            'description' => '',
        ],
    ],
    'formulas' => [
        'auctionCommissionYen' => [
            'op' => 'table',
            'input' => ['ref' => 'auctionYen'],
            'bands' => [
                ['max' => 800000, 'value' => 0],
                ['max' => 1200000, 'value' => 15000],
                ['max' => 1500000, 'value' => 25000],
                ['max' => 2000000, 'value' => 40000],
                ['max' => 4000000, 'value' => 80000],
                ['max' => 5000000, 'value' => 120000],
            ],
            'default' => ['op' => 'mul', 'args' => [['ref' => 'auctionYen'], 0.04]],
            'round' => 'nearest',
        ],
        'japanYenTotal' => [
            'op' => 'sum',
            'args' => [['ref' => 'auctionYen'], ['ref' => 'fobYen'], ['ref' => 'vanningYen'], ['ref' => 'auctionCommissionYen']],
        ],
        'japanMntTotal' => [
            'op' => 'sum',
            'args' => [
                ['op' => 'mul', 'args' => [['ref' => 'japanYenTotal'], ['ref' => 'jpyMnt']]],
                ['ref' => 'japanFixedMnt'],
            ],
        ],
        'trainDeliveryUsd' => [
            'op' => 'sum',
            'args' => [['ref' => 'usdTrainContainer'], ['ref' => 'mongoliaDocsUsd'], ['ref' => 'borderSupportUsd'], ['ref' => 'trainCarrierUsd']],
        ],
        'trackDeliveryUsd' => [
            'op' => 'sum',
            'args' => [['ref' => 'usdTrackContainer'], ['ref' => 'mongoliaDocsUsd'], ['ref' => 'borderSupportUsd'], ['ref' => 'trackCarrierUsd']],
        ],
        'rubInvoiceMntEquivalent' => ['op' => 'mul', 'args' => [['ref' => 'rubInInvoice'], ['ref' => 'mntPerRub']]],
        // Расходы до Монголии — только $-часть; таможенная очистка отдельной строкой входит в инвойс.
        'trainDeliveryMnt' => ['op' => 'mul', 'args' => [['ref' => 'trainDeliveryUsd'], ['ref' => 'usdMnt']]],
        'trackDeliveryMnt' => ['op' => 'mul', 'args' => [['ref' => 'trackDeliveryUsd'], ['ref' => 'usdMnt']]],
        'invoiceMntTrain' => ['op' => 'sum', 'args' => [['ref' => 'japanMntTotal'], ['ref' => 'trainDeliveryMnt'], ['ref' => 'rubInvoiceMntEquivalent']]],
        'invoiceMntTrack' => ['op' => 'sum', 'args' => [['ref' => 'japanMntTotal'], ['ref' => 'trackDeliveryMnt'], ['ref' => 'rubInvoiceMntEquivalent']]],
        'payableMntTrain' => ['op' => 'sum', 'args' => [['ref' => 'invoiceMntTrain'], ['ref' => 'agentFixedMnt']]],
        'payableMntTrack' => ['op' => 'sum', 'args' => [['ref' => 'invoiceMntTrack'], ['ref' => 'agentFixedMnt']]],
        'invoiceRubTrain' => ['op' => 'div', 'args' => [['ref' => 'payableMntTrain'], ['ref' => 'mntPerRub']]],
        'invoiceRubTrack' => ['op' => 'div', 'args' => [['ref' => 'payableMntTrack'], ['ref' => 'mntPerRub']]],
        'invoiceYenTrain' => ['op' => 'div', 'args' => [['ref' => 'invoiceMntTrain'], ['ref' => 'jpyMnt']]],
        'invoiceYenTrack' => ['op' => 'div', 'args' => [['ref' => 'invoiceMntTrack'], ['ref' => 'jpyMnt']]],
    ],
];
