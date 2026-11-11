import { Calculadora } from '@/components/calculadora/calculadora';

export default function Inicio() {
	return (
		<section className="wrap pagina-calculo">
			<div className="intro">
				<h1>Etanol ou gasolina? Depende do seu carro.</h1>
				<p>A conta dos 70% vale para um carro médio. Aqui o cálculo usa o consumo do seu carro na cidade e na estrada.</p>
			</div>
			<Calculadora />
		</section>
	);
}
