param()

$queries = @(
    @{ Name = "02_Горин_демоблил"; Query = "демоблил" },
    @{ Name = "03_Дисней_долгий_ящик"; Query = "долгий ящик" },
    @{ Name = "04_Самойленко_блокнули_клода"; Query = "блокнули клода" },
    @{ Name = "05_Эдик_11_пунктов"; Query = "11 пунктов" },
    @{ Name = "06_Эдик_тент_как_родного_брата"; Query = "как родного брата" },
    @{ Name = "07_Корова_UFO_лазер"; Query = "корова" },
    @{ Name = "08_Роял_Арк_филлинга_0"; Query = "филлинга" },
    @{ Name = "09_Хухро_Горин_пирамиды"; Query = "Пирамиды это музей" },
    @{ Name = "10_Сундук_звук_яйца"; Query = "не яйцо" },
    @{ Name = "11_Суперселл_Mavis_legs"; Query = "Mavis" },
    @{ Name = "12_Машина_времени_Ник_правьте_даты"; Query = "правьте даты" },
    @{ Name = "13_Скриптор_Даниал_3А_проект"; Query = "падению акций" }
)

foreach ($item in $queries) {
    $outFile = "H:\PLBX\CyberBullingConcept\Скриншоты_Slack\$($item.Name).png"
    Write-Host ">>> Processing $($item.Name) with query '$($item.Query)'..."
    powershell -NoProfile -ExecutionPolicy Bypass -File "H:\PLBX\CyberBullingConcept\Capture.ps1" -Action search_and_capture -Query $item.Query -OutFile $outFile
    Start-Sleep -Seconds 1
}

Write-Host "All screenshots completed!"
