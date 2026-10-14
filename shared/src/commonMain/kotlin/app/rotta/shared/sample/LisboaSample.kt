package app.rotta.shared.sample

import app.rotta.shared.model.DayPlan
import app.rotta.shared.model.GeoPoint
import app.rotta.shared.model.OpeningHours
import app.rotta.shared.model.Pace
import app.rotta.shared.model.Place
import app.rotta.shared.model.PlaceCatalog
import app.rotta.shared.model.PlaceKind
import app.rotta.shared.model.Stop
import app.rotta.shared.model.TimeOfDay
import app.rotta.shared.model.Trip
import app.rotta.shared.model.TripDate
import app.rotta.shared.model.Weekday

/**
 * Viagem de exemplo usada enquanto o app não fala com o backend.
 * Horários e textos são ilustrativos; no app final vêm do Google Places
 * e de resumos da Wikipedia.
 */
object LisboaSample {
    private fun t(h: Int, m: Int = 0) = TimeOfDay.of(h, m)
    private val segunda = setOf(Weekday.SEGUNDA)

    val catalog = PlaceCatalog(
        listOf(
            Place(
                id = "torre", name = "Torre de Belém", kind = PlaceKind.MONUMENTO, neighborhood = "Belém",
                location = GeoPoint(38.6916, -9.2160), indoor = true,
                hours = OpeningHours(t(10), t(17, 30), segunda), suggestedMinutes = 60, priority = 5,
                story = "Construída entre 1514 e 1519 para defender a entrada do porto de Lisboa no rio Tejo. " +
                    "É um símbolo do estilo manuelino e da era dos Descobrimentos, Patrimônio Mundial da UNESCO desde 1983.",
                tips = listOf("Chegue cedo: a fila cresce ao longo da manhã.", "Combine com o Mosteiro dos Jerónimos, a poucos minutos a pé."),
                sourceUrl = "https://pt.wikipedia.org/wiki/Torre_de_Bel%C3%A9m",
            ),
            Place(
                id = "jeronimos", name = "Mosteiro dos Jerónimos", kind = PlaceKind.MONUMENTO, neighborhood = "Belém",
                location = GeoPoint(38.6979, -9.2068), indoor = true,
                hours = OpeningHours(t(9, 30), t(17, 30), segunda), suggestedMinutes = 90, priority = 5,
                story = "Encomendado por D. Manuel I no início do século XVI, é uma obra-prima do estilo manuelino. " +
                    "A igreja guarda o túmulo de Vasco da Gama.",
                tips = listOf("A entrada da igreja e a do claustro são separadas.", "Compre o ingresso antes para pular a fila."),
                sourceUrl = "https://pt.wikipedia.org/wiki/Mosteiro_dos_Jer%C3%B3nimos",
            ),
            Place(
                id = "pasteis", name = "Pastéis de Belém", kind = PlaceKind.DOCERIA, neighborhood = "Belém",
                location = GeoPoint(38.6975, -9.2032), indoor = true,
                hours = OpeningHours(t(8), t(20)), suggestedMinutes = 40, priority = 4,
                story = "Produz desde 1837 os pastéis de nata de uma receita ligada aos monges do Mosteiro dos Jerónimos.",
                tips = listOf("A fila do balcão anda rápido; para sentar, entre e procure mesa lá dentro.", "Peça com canela e açúcar."),
            ),
            Place(
                id = "lxfactory", name = "LX Factory", kind = PlaceKind.CENTRO_CRIATIVO, neighborhood = "Alcântara",
                location = GeoPoint(38.7033, -9.1789), indoor = true,
                hours = OpeningHours(t(10), t(20)), suggestedMinutes = 120, priority = 2,
                story = "Antigo complexo industrial do século XIX, hoje ocupado por lojas, restaurantes, livrarias e ateliês.",
                tips = listOf("Reserve tempo para a livraria Ler Devagar.", "Bom lugar para almoçar sem pressa."),
            ),
            Place(
                id = "castelo", name = "Castelo de São Jorge", kind = PlaceKind.MONUMENTO, neighborhood = "Alfama",
                location = GeoPoint(38.7139, -9.1335), indoor = false,
                hours = OpeningHours(t(9), t(18)), suggestedMinutes = 90, priority = 5,
                story = "Fortificação de origem moura no alto de uma das colinas mais antigas da cidade, com vista para a Baixa e o Tejo.",
                tips = listOf("O fim de tarde tem a melhor luz para fotos.", "As ladeiras são íngremes: vá de elétrico ou táxi."),
                sourceUrl = "https://pt.wikipedia.org/wiki/Castelo_de_S%C3%A3o_Jorge",
            ),
            Place(
                id = "alfama", name = "Passeio por Alfama", kind = PlaceKind.BAIRRO, neighborhood = "Alfama",
                location = GeoPoint(38.7110, -9.1300), indoor = false,
                hours = OpeningHours.ALWAYS, suggestedMinutes = 60, priority = 3,
                story = "O bairro mais antigo de Lisboa, de ruelas estreitas, escadarias e casas de fado.",
                tips = listOf("Use sapato confortável: a calçada portuguesa escorrega."),
            ),
            Place(
                id = "fado", name = "Jantar com fado", kind = PlaceKind.RESTAURANTE, neighborhood = "Alfama",
                location = GeoPoint(38.7115, -9.1290), indoor = true,
                hours = OpeningHours(t(19, 30), TimeOfDay.END_OF_DAY), suggestedMinutes = 120, priority = 4,
                story = "O fado, canção urbana de Lisboa, é Patrimônio Cultural Imaterial da Humanidade pela UNESCO desde 2011.",
                tips = listOf("Faça reserva.", "Durante a apresentação, silêncio total."),
            ),
            Place(
                id = "gulbenkian", name = "Museu Calouste Gulbenkian", kind = PlaceKind.MUSEU, neighborhood = "Avenidas Novas",
                location = GeoPoint(38.7372, -9.1546), indoor = true,
                hours = OpeningHours(t(10), t(18), setOf(Weekday.TERCA)), suggestedMinutes = 120, priority = 4,
                story = "Reúne a coleção do colecionador Calouste Gulbenkian, da arte egípcia às joias de René Lalique, cercada por um jardim.",
                tips = listOf("O jardim é ótimo para uma pausa entre as salas."),
            ),
            Place(
                id = "timeout", name = "Time Out Market", kind = PlaceKind.MERCADO, neighborhood = "Cais do Sodré",
                location = GeoPoint(38.7069, -9.1459), indoor = true,
                hours = OpeningHours(t(10), TimeOfDay.END_OF_DAY), suggestedMinutes = 75, priority = 3,
                story = "No antigo Mercado da Ribeira, reúne dezenas de restaurantes e chefs da cidade sob o mesmo teto.",
                tips = listOf("No almoço de fim de semana enche: chegue antes das 12h30."),
            ),
            Place(
                id = "stcatarina", name = "Miradouro de Santa Catarina", kind = PlaceKind.MIRANTE, neighborhood = "Santa Catarina",
                location = GeoPoint(38.7094, -9.1474), indoor = false,
                hours = OpeningHours.ALWAYS, suggestedMinutes = 45, priority = 2,
                story = "Mirante com vista para o Tejo e a Ponte 25 de Abril, ponto de encontro no fim de tarde.",
                tips = listOf("Vá no pôr do sol."),
            ),
            Place(
                id = "azulejo", name = "Museu Nacional do Azulejo", kind = PlaceKind.MUSEU, neighborhood = "Xabregas",
                location = GeoPoint(38.7247, -9.1135), indoor = true,
                hours = OpeningHours(t(10), t(18), segunda), suggestedMinutes = 90, priority = 4,
                story = "No antigo Convento da Madre de Deus, conta cinco séculos de história do azulejo em Portugal.",
                tips = listOf("Não perca o grande painel de Lisboa antes do terremoto de 1755."),
            ),
            Place(
                id = "mnaa", name = "Museu Nacional de Arte Antiga", kind = PlaceKind.MUSEU, neighborhood = "Lapa",
                location = GeoPoint(38.7050, -9.1610), indoor = true,
                hours = OpeningHours(t(10), t(18), segunda), suggestedMinutes = 90, priority = 3,
                story = "Principal museu de arte de Portugal, com obras como os Painéis de São Vicente.",
                tips = listOf("O jardim do museu tem vista para o rio."),
            ),
            Place(
                id = "oceanario", name = "Oceanário de Lisboa", kind = PlaceKind.AQUARIO, neighborhood = "Parque das Nações",
                location = GeoPoint(38.7636, -9.0938), indoor = true,
                hours = OpeningHours(t(10), t(19)), suggestedMinutes = 120, priority = 4,
                story = "Um dos maiores aquários da Europa, construído para a Expo 98 no Parque das Nações.",
                tips = listOf("Compre o ingresso online."),
            ),
            Place(
                id = "pena", name = "Palácio da Pena", kind = PlaceKind.PALACIO, neighborhood = "Sintra",
                location = GeoPoint(38.7876, -9.3906), indoor = false,
                hours = OpeningHours(t(9, 30), t(18, 30)), suggestedMinutes = 180, priority = 5,
                story = "Palácio romântico do século XIX no alto da serra de Sintra, de cores vivas e vista para o Atlântico.",
                tips = listOf("Reserve horário de entrada.", "Há neblina com frequência: leve casaco."),
            ),
            Place(
                id = "regaleira", name = "Quinta da Regaleira", kind = PlaceKind.PALACIO, neighborhood = "Sintra",
                location = GeoPoint(38.7963, -9.3960), indoor = false,
                hours = OpeningHours(t(10), t(18, 30)), suggestedMinutes = 150, priority = 4,
                story = "Palácio e jardins do início do século XX, famosos pelo Poço Iniciático, uma escada em espiral que desce pela terra.",
                tips = listOf("Leve lanterna do celular para os túneis."),
            ),
            Place(
                id = "palacio", name = "Palácio Nacional de Sintra", kind = PlaceKind.PALACIO, neighborhood = "Sintra",
                location = GeoPoint(38.7975, -9.3906), indoor = true,
                hours = OpeningHours(t(9, 30), t(18, 30)), suggestedMinutes = 90, priority = 3,
                story = "Palácio real de origem medieval no centro de Sintra, reconhecível pelas duas grandes chaminés cônicas.",
                tips = listOf("Fica no centro, fácil de encaixar no fim do dia."),
            ),
            Place(
                id = "sintra", name = "Centro histórico de Sintra", kind = PlaceKind.BAIRRO, neighborhood = "Sintra",
                location = GeoPoint(38.7985, -9.3880), indoor = false,
                hours = OpeningHours.ALWAYS, suggestedMinutes = 60, priority = 1,
                story = "Ruelas com cafés e os doces típicos da vila, como as queijadas e os travesseiros.",
                tips = listOf("O último trem para Lisboa sai à noite: confira o horário."),
            ),
        ),
    )

    fun trip(): Trip {
        val start = TripDate(2026, 11, 12)
        return Trip(
            id = "lisboa-2026",
            destination = "Lisboa",
            country = "Portugal",
            travelers = 2,
            budgetBrl = 18_000,
            pace = Pace.MEDIO,
            days = listOf(
                DayPlan(
                    date = start, title = "Alfama e Castelo", availableFrom = t(15),
                    stops = listOf(Stop("castelo", t(16), 90), Stop("alfama", t(17, 45), 60), Stop("fado", t(20), 120)),
                ),
                DayPlan(
                    date = start.plusDays(1), title = "Belém e Alcântara",
                    stops = listOf(
                        Stop("torre", t(10), 60), Stop("jeronimos", t(11, 20), 90),
                        Stop("pasteis", t(13), 40), Stop("lxfactory", t(14, 30), 120),
                    ),
                ),
                DayPlan(
                    date = start.plusDays(2), title = "Museus e mirantes", rainExpected = true,
                    stops = listOf(Stop("gulbenkian", t(10), 120), Stop("timeout", t(13), 75), Stop("stcatarina", t(17), 45)),
                ),
                DayPlan(
                    date = start.plusDays(3), title = "Sintra",
                    stops = listOf(
                        Stop("pena", t(9, 30), 180), Stop("regaleira", t(13), 150),
                        Stop("palacio", t(16), 90), Stop("sintra", t(17, 45), 60),
                    ),
                ),
                DayPlan(
                    date = start.plusDays(4), title = "Último dia", availableUntil = t(14),
                    stops = listOf(Stop("azulejo", t(10), 90), Stop("oceanario", t(12), 90)),
                ),
            ),
        )
    }
}
