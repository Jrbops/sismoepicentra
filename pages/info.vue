<template>
  <div class="info" vertical-center>
    <div class="info__title" horizontal-center>
      <h2>Epicentra İo</h2>
      <span>v{{ config.public.appVersion }}</span>
    </div>
    <br />
    <div class="info__questions" vertical-center>
      <div class="item">
        <h4>Deprem Verileri Nereden Çekiliyor?</h4>
        <p>
          Veriler Afad'dan anlık olarak çekilmekte olup hiçbir manipulasyona
          uğratılmamaktadır. Kaynak:
          <a href="https://deprem.afad.gov.tr/last-earthquakes.html">Afad</a>
          <br />
        </p>
      </div>
      <div class="item">
        <h4>Tarihsel Deprem Grafiği Nasıl Oluşturuluyor?</h4>
        <p>
          Afad'dan gelen X şehrine ait tüm veriler belirli hesaplamalardan
          geçirilerek grafiğe dönüştürülür. Bu işlemde maksimum deprem şiddeti:
          <strong>9.5</strong> referans alınıp bu uç noktasına göre
          hesaplanmaktadır.
        </p>
        <img
          src="~~/assets/img/promotion/earthquake-item.png"
          alt="Epicentra İo deprem grafiği"
        />
      </div>
      <div class="item">
        <h4>Gri, Sarı ve Kırmızı renkler ne anlama geliyor?</h4>
        <p>
          Listelemede herhangi bir depremin tasarım rengi o depremin şiddeti ile
          yapılan bir hesaplama sonucu belirlenmektedir.
          <br />
          <br />
          <strong>Gri:</strong> 3'ten büyük <strong>Sarı:</strong> 5'ten büyük
          <strong>Kırmızı:</strong>7'den büyük
        </p>
      </div>
      <div class="item">
        <h4>
          Deprem grafiği aynı olan iki şehir aynı depremlerden mi etkileniyor?
        </h4>
        <p>
          Böyle bir çıkarımda bulunmak yanlıştır denemez ama doğru da değildir.
          Bu noktada deprem uzmanları tarafından teknik yorumları dikkate
          alınması gerek.
        </p>
        <img
          src="~~/assets/img/promotion/earthquake-item-2.png"
          alt="Epicentra İo benzer deprem grafiği"
        />
      </div>
    </div>
    <div class="info__kvkk">
      <p>
        <strong
          >Bu sitedeki veriler
          <a href="https://deprem.afad.gov.tr/last-earthquakes.html"
            >Afad'dan</a
          >
          çekilmekte olup herhangi bir manipulasyona uğratılmamaktadır.
          <a href="https://zelzele.io/">Epicentra İo</a> bu verileri sadece aynen
          iletmekte olup, bu verilerin yanlışlığından doğacak hiçbir sorumluluğu
          kabul etmemektedir.</strong
        >
      </p>
    </div>
    
    <div class="info__note" vertical-center>
      <p>
        Unutmak yarınlarımıza ve kaybettiğimiz insanlarımıza saygısızlıktır. 6
        Şubat 2023 Kahramanmaraş ve çevre illerinde gerçekleşen Depremlerde
        hayatını kaybedenleri saygıyla anıyor, yakınlarına sabırlar diliyoruz.
      </p>
      <img src="~~/assets/img/promotion/mourn.png" alt="" />
    </div>
  </div>
</template>
<script lang="ts" setup>
const config = useRuntimeConfig();
useHead({
  title: "Epicentra İo tanıtım ve bilgi sayfası",
  meta: [
    {
      name: "description",
      content:
        "Epicentra İo Nedir? Epicentra İo kullanım koşuları nelerdir? Tüm depremler grafiği nasıl oluşturulur?",
    },
  ],
});
</script>
<style lang="scss" scoped>
.info {
  padding: 0 $padding-one;
  width: 100%;
  margin-top: 40px;
  max-width: $max-width-one;
  margin-inline:auto;
  p {
    margin-top: 20px;
    font-size: 16px;
    line-height: 24px;
    a {
      color: inherit;
      font-weight: bold;
    }
  }
  &__title {
    width: 100%;
    justify-content: flex-start;
    span {
      margin-left: 10px;
      padding-top: 8px;
      font-size: 12px;
      font-weight: bold;
    }
  }
  &__questions {
    width: 100%;
    align-items: flex-start;
    .item {
      padding-bottom: 30px;
      img {
        width: 100%;
        margin-top: 20px;
      }
    }
  }
  &__contact {
    width: 100%;
    margin-top: 30px;
  }
  &__note {
    font-weight: bold;
    color: black;
    img {
      width: 50px;
      margin-top: 40px;
    }
  }
}
</style>
