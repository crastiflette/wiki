/*
 * DONNÉES : une entrée par technologie. Pour en ajouter une, copie un bloc.
 *   name, description : texte affiché sur la fiche
 *   level    : "CCNA" ou "ENCOR" (onglets CCNA / CCNP ENCOR)
 *   category : "" ou "sec" (Security) ou "svc" (Services)
 *   prompt   : équipement affiché dans le prompt : "R1" (routeur) ou "SW1" (switch)
 *   config, show, troubleshoot, debug : une commande par ligne.
 *   Les <VARIABLES> en majuscules sont surlignées et acceptent n'importe quelle valeur à l'entraînement.
 */
const D = [
  {
    name: "Basic IOS",
    level: "CCNA",
    category: "",
    prompt: "R1",
    description:
      "La configuration de base à faire sur tout équipement neuf : lui donner un nom, protéger l'accès au mode privilégié, rendre la console plus confortable et surtout sauvegarder. La configuration en cours (running-config) est en mémoire vive : sans sauvegarde dans la startup-config, tout est perdu au redémarrage.",
    config: `! Nom de l'équipement (il apparaît dans le prompt)
hostname <HOSTNAME>
! Évite que IOS prenne une faute de frappe pour un nom DNS et attende de le résoudre
no ip domain-lookup
! Mot de passe du mode privilégié, stocké sous forme de hash
enable secret <PASSWORD>
! Chiffre (faiblement) les mots de passe restés en clair dans la configuration
service password-encryption
! Message affiché avant la connexion
banner motd #<MESSAGE>#
! Console : les logs n'interrompent plus la saisie et la session ne se ferme plus toute seule
line console 0
 logging synchronous
 exec-timeout 0 0
! Sauvegarde la configuration courante dans la NVRAM
copy running-config startup-config`,
    show: `show running-config
show startup-config
show version
show clock
show history`,
    troubleshoot: `show logging
show running-config | section <KEYWORD>`,
    debug: `terminal monitor
undebug all`,
  },
  {
    name: "Interfaces",
    level: "CCNA",
    category: "",
    prompt: "R1",
    description:
      "Les interfaces sont les ports de l'équipement. Il faut les configurer (adresse IP, description, vitesse) puis les activer : sur un routeur, une interface est éteinte (shutdown) par défaut. Vérifier leur état est le premier réflexe de tout dépannage.",
    config: `! Entre dans la configuration du port
interface GigabitEthernet0/1
 ! Texte libre pour documenter à quoi sert le port
 description <TEXT>
 ! Adresse IP et masque de l'interface
 ip address <IP_ADDRESS> <SUBNET_MASK>
 ! Vitesse et duplex négociés automatiquement avec l'équipement en face
 speed auto
 duplex auto
 ! Active l'interface
 no shutdown`,
    show: `show ip interface brief
show interfaces
show interfaces status
show interfaces description`,
    troubleshoot: `show interfaces <INTERFACE>
show interfaces counters errors
show controllers <INTERFACE>`,
    debug: ``,
  },
  {
    name: "VLAN",
    level: "CCNA",
    category: "",
    prompt: "SW1",
    description:
      "Un VLAN découpe un switch en plusieurs réseaux de niveau 2 isolés, même s'ils partagent le même matériel. Il sert à séparer les services (comptabilité, invités, serveurs), à réduire les domaines de broadcast et à améliorer la sécurité. Chaque VLAN utilise en général son propre sous-réseau IP.",
    config: `! Crée le VLAN et lui donne un nom
vlan <VLAN_ID>
 name <VLAN_NAME>
! Sélectionne le port à affecter au VLAN
interface <INTERFACE>
 ! Port d'accès : il appartient à un seul VLAN (PC, imprimante...)
 switchport mode access
 ! VLAN auquel le port est affecté
 switchport access vlan <VLAN_ID>`,
    show: `show vlan brief
show interfaces switchport
show mac address-table`,
    troubleshoot: `show vlan brief
show interfaces switchport
show mac address-table vlan <VLAN_ID>`,
    debug: ``,
  },
  {
    name: "Trunk / 802.1Q",
    level: "CCNA",
    category: "",
    prompt: "SW1",
    description:
      "Un trunk transporte plusieurs VLAN sur un seul lien, entre deux switchs ou entre un switch et un routeur. Le standard 802.1Q ajoute à chaque trame une étiquette (tag) contenant son numéro de VLAN, ce qui évite d'utiliser un câble par VLAN.",
    config: `! Port qui relie deux switchs (ou un switch et un routeur)
interface <INTERFACE>
 ! Encapsulation 802.1Q (les switchs récents ne la proposent plus : la ligne est alors refusée)
 switchport trunk encapsulation dot1q
 ! Force le port en trunk
 switchport mode trunk
 ! Limite les VLAN autorisés sur la liaison
 switchport trunk allowed vlan <VLAN_LIST>
 ! VLAN natif : trames non étiquetées, à garder identique aux deux extrémités
 switchport trunk native vlan <VLAN_ID>`,
    show: `show interfaces trunk
show interfaces <INTERFACE> switchport`,
    troubleshoot: `show interfaces trunk
show interfaces switchport
show spanning-tree vlan <VLAN_ID>`,
    debug: `debug dtp packets`,
  },
  {
    name: "Inter-VLAN Routing",
    level: "CCNA",
    category: "",
    prompt: "R1/SW1",
    description:
      "Les VLAN étant isolés, il faut un équipement de niveau 3 pour les faire communiquer. Le router-on-a-stick utilise un seul lien trunk vers un routeur ; un switch L3 route lui-même grâce à des interfaces virtuelles (SVI), plus rapidement. Dans les deux cas, l'adresse IP configurée sert de passerelle aux machines du VLAN.",
    config: `! ----- Méthode 1 : router-on-a-stick (sur le routeur) -----
! Sous-interface dédiée à un VLAN, sur le lien trunk vers le switch
interface GigabitEthernet0/0.<VLAN_ID>
 ! Étiquette 802.1Q des trames de ce VLAN
 encapsulation dot1Q <VLAN_ID>
 ! Passerelle par défaut des machines de ce VLAN
 ip address <IP_ADDRESS> <SUBNET_MASK>
! ----- Méthode 2 : switch L3 avec SVI (sur le switch) -----
! Active le routage IP sur le switch
ip routing
! SVI : interface virtuelle du VLAN, qui sert de passerelle
interface vlan <VLAN_ID>
 ip address <IP_ADDRESS> <SUBNET_MASK>
 no shutdown`,
    show: `show ip interface brief
show ip route
show interfaces trunk`,
    troubleshoot: `show vlan brief
show ip route connected`,
    debug: ``,
  },
  {
    name: "STP / RSTP",
    level: "CCNA",
    category: "",
    prompt: "SW1",
    description:
      "Le Spanning Tree évite les boucles de niveau 2 quand des switchs sont reliés par plusieurs chemins : une boucle provoque des tempêtes de broadcast qui paralysent le réseau. Il élit un switch racine, bloque les liens redondants et les réactive en cas de panne. RSTP fait la même chose avec une convergence beaucoup plus rapide.",
    config: `! Mode Rapid PVST+ : convergence en quelques secondes au lieu de 30 à 50 s
spanning-tree mode rapid-pvst
! Ce switch devient la racine (root bridge) du VLAN : sa priorité est abaissée automatiquement
spanning-tree vlan <VLAN_ID> root primary
! Ou priorité fixée à la main (multiple de 4096) : la plus basse est élue racine
spanning-tree vlan <VLAN_ID> priority 4096
! Port relié à un poste final
interface <INTERFACE>
 ! Passe directement en forwarding, sans attendre
 spanning-tree portfast
 ! Coupe le port si un switch y est branché (réception d'un BPDU) : protège contre les boucles
 spanning-tree bpduguard enable`,
    show: `show spanning-tree
show spanning-tree summary
show spanning-tree vlan <VLAN_ID>
show spanning-tree interface <INTERFACE> detail`,
    troubleshoot: `show spanning-tree blockedports
show spanning-tree inconsistentports`,
    debug: `debug spanning-tree events
undebug all`,
  },
  {
    name: "EtherChannel / LACP",
    level: "CCNA",
    category: "",
    prompt: "SW1",
    description:
      "L'EtherChannel regroupe plusieurs liens physiques en un seul lien logique : plus de bande passante et de la redondance. STP le voit comme un seul lien, donc aucun port n'est bloqué. LACP (802.3ad) négocie le groupe avec l'autre équipement ; les paramètres des ports doivent être identiques des deux côtés.",
    config: `! Sélectionne tous les ports physiques à regrouper
interface range <INTERFACE_RANGE>
 ! Les place dans le groupe ; active = ce switch propose LACP à l'autre extrémité
 channel-group <ID> mode active
! Interface logique créée automatiquement : les réglages (trunk, VLAN...) se font ici
interface port-channel <ID>
 switchport mode trunk`,
    show: `show etherchannel summary
show interfaces port-channel <ID>
show etherchannel port-channel`,
    troubleshoot: `show etherchannel summary
show lacp neighbor
show running-config interface <INTERFACE>`,
    debug: `debug lacp packet
debug etherchannel`,
  },
  {
    name: "DHCP",
    level: "CCNA",
    category: "svc",
    prompt: "R1",
    description:
      "Le DHCP distribue automatiquement aux machines leur adresse IP, leur masque, leur passerelle et leur DNS, au lieu de les saisir à la main. Un routeur peut faire office de serveur. Si le serveur est sur un autre réseau, un relais transmet les requêtes des clients, car les broadcasts ne traversent pas les routeurs.",
    config: `! Adresses à ne jamais distribuer (passerelle, serveurs, imprimantes...)
ip dhcp excluded-address <START_IP> <END_IP>
! Crée la plage d'adresses à distribuer
ip dhcp pool <POOL_NAME>
 ! Réseau concerné
 network <NETWORK> <SUBNET_MASK>
 ! Passerelle par défaut donnée aux clients
 default-router <GATEWAY_IP>
 ! Serveur DNS donné aux clients
 dns-server <DNS_IP>
! Relais DHCP : sur l'interface côté clients, quand le serveur est sur un autre réseau
interface <INTERFACE>
 ip helper-address <DHCP_SERVER_IP>`,
    show: `show ip dhcp binding
show ip dhcp pool
show ip dhcp conflict`,
    troubleshoot: `show ip dhcp conflict
show ip dhcp server statistics
show ip interface <INTERFACE>`,
    debug: `debug ip dhcp server events
debug ip dhcp server packet`,
  },
  {
    name: "NAT / PAT",
    level: "CCNA",
    category: "svc",
    prompt: "R1",
    description:
      "Le NAT remplace les adresses IP privées, non routables sur Internet, par une adresse publique. Avec le PAT (overload), tout un réseau partage une seule IP publique et les connexions sont distinguées par leur numéro de port. C'est ce qui permet à un réseau local d'accéder à Internet.",
    config: `! Interface côté réseau interne (LAN)
interface <INSIDE_INTERFACE>
 ip nat inside
! Interface côté Internet
interface <OUTSIDE_INTERFACE>
 ip nat outside
! ACL qui désigne les adresses privées à traduire
access-list 1 permit <NETWORK> <WILDCARD>
! Traduit ces adresses vers l'IP de l'interface externe ; overload = PAT (partage via les ports)
ip nat inside source list 1 interface <OUTSIDE_INTERFACE> overload`,
    show: `show ip nat translations
show ip nat statistics`,
    troubleshoot: `show ip nat statistics
show access-lists
show ip route`,
    debug: `debug ip nat
undebug all`,
  },
  {
    name: "ACL",
    level: "CCNA",
    category: "sec",
    prompt: "R1",
    description:
      "Une ACL est une liste de règles permit / deny qui filtre le trafic selon les adresses, les protocoles et les ports. Les règles sont lues de haut en bas et la première qui correspond s'applique ; un deny implicite termine toujours la liste. On place une ACL étendue au plus près de la source du trafic.",
    config: `! ACL étendue nommée : filtre selon source, destination, protocole et port
ip access-list extended <ACL_NAME>
 ! Autorise le SSH (TCP 22) depuis le réseau source
 permit tcp <SOURCE> <WILDCARD> any eq 22
 ! Refuse tout le reste et le journalise (le deny implicite existe déjà, mais sans log)
 deny ip any any log
! Applique l'ACL sur une interface
interface <INTERFACE>
 ! in = filtre le trafic entrant, out = le trafic sortant
 ip access-group <ACL_NAME> in`,
    show: `show access-lists
show ip access-lists <ACL_NAME>
show ip interface <INTERFACE> | include access list`,
    troubleshoot: `show access-lists
clear ip access-list counters`,
    debug: `debug ip packet <ACL_NUMBER>`,
  },
  {
    name: "Static / Default Routing",
    level: "CCNA",
    category: "",
    prompt: "R1",
    description:
      "Une route statique indique à la main à un routeur par où envoyer le trafic vers un réseau donné. Simple et prévisible, elle convient aux petits réseaux ou aux liens uniques, mais ne s'adapte pas aux pannes. La route par défaut sert de sortie pour tout le trafic dont la destination est inconnue.",
    config: `! Route statique : pour joindre ce réseau, passer par ce voisin (next-hop)
ip route <NETWORK> <SUBNET_MASK> <NEXT_HOP>
! Route par défaut : tout ce qui n'a pas de route plus précise part par là (vers Internet)
ip route 0.0.0.0 0.0.0.0 <NEXT_HOP>`,
    show: `show ip route
show ip route static
show running-config | include ip route`,
    troubleshoot: `show ip route <NETWORK>
ping <IP_ADDRESS>
traceroute <IP_ADDRESS>`,
    debug: ``,
  },
  {
    name: "OSPF",
    level: "CCNA",
    category: "",
    prompt: "R1",
    description:
      "OSPF est un protocole de routage dynamique à état de liens : chaque routeur connaît la carte du réseau et calcule lui-même le meilleur chemin, d'après un coût lié à la bande passante. Il converge vite et s'adapte aux pannes. Les routeurs sont regroupés en aires, l'aire 0 étant le cœur du réseau.",
    config: `! Lance OSPF (le numéro de processus n'a qu'une valeur locale)
router ospf <PROCESS_ID>
 ! Identifiant unique du routeur, au format d'une adresse IP
 router-id <ROUTER_ID>
 ! Les interfaces dont l'IP est dans ce réseau participent à OSPF, dans cette aire
 network <NETWORK> <WILDCARD> area <AREA>
 ! N'envoie pas de messages OSPF sur cette interface (ex. côté LAN)
 passive-interface <INTERFACE>
 ! Annonce la route par défaut aux autres routeurs OSPF
 default-information originate`,
    show: `show ip ospf
show ip ospf neighbor
show ip ospf interface
show ip route ospf
show ip protocols`,
    troubleshoot: `show ip ospf neighbor
show ip ospf interface
show ip route ospf
debug ip ospf adj`,
    debug: `debug ip ospf adj
debug ip ospf events
undebug all`,
  },
  {
    name: "HSRP",
    level: "CCNA",
    category: "",
    prompt: "R1",
    description:
      "HSRP donne une passerelle par défaut redondante : deux routeurs partagent une adresse IP virtuelle. L'un est actif et traite le trafic, l'autre prend le relais automatiquement en cas de panne, sans rien changer sur les PC. Il protège contre la panne du routeur de sortie.",
    config: `interface <INTERFACE>
 ! Version 2 : plus de groupes possibles et prise en charge de l'IPv6
 standby version 2
 ! Adresse IP virtuelle : c'est la passerelle à configurer sur les PC
 standby <GROUP> ip <VIRTUAL_IP>
 ! Priorité (100 par défaut) : la plus haute devient le routeur actif
 standby <GROUP> priority <PRIORITY>
 ! Reprend le rôle d'actif dès que ce routeur est de retour
 standby <GROUP> preempt`,
    show: `show standby
show standby brief`,
    troubleshoot: `show standby brief
show ip interface brief`,
    debug: `debug standby events
debug standby errors`,
  },
  {
    name: "IPv6 / NDP / SLAAC",
    level: "CCNA",
    category: "",
    prompt: "R1",
    description:
      "IPv6 remplace IPv4 par des adresses de 128 bits et supprime le besoin de NAT. NDP remplace ARP pour trouver les voisins, et SLAAC permet à une machine de fabriquer elle-même son adresse à partir du préfixe annoncé par le routeur, sans serveur DHCP.",
    config: `! Active le routage IPv6 (désactivé par défaut)
ipv6 unicast-routing
interface <INTERFACE>
 ! Adresse IPv6 statique avec son préfixe /64
 ipv6 address <IPV6_PREFIX>/64
 ! Ou : l'interface se configure seule (SLAAC) à partir du préfixe annoncé par un routeur
 ipv6 address autoconfig
! Route par défaut IPv6
ipv6 route ::/0 <NEXT_HOP>`,
    show: `show ipv6 interface brief
show ipv6 route
show ipv6 neighbors`,
    troubleshoot: `show ipv6 neighbors
show ipv6 interface <INTERFACE>
ping ipv6 <IPV6_ADDRESS>`,
    debug: `debug ipv6 nd`,
  },
  {
    name: "CDP / LLDP",
    level: "CCNA",
    category: "",
    prompt: "SW1",
    description:
      "CDP (Cisco) et LLDP (standard) sont des protocoles de niveau 2 qui permettent à un équipement de découvrir ses voisins directs : nom, modèle, ports, adresse IP. Ils servent à cartographier un réseau et à vérifier un câblage. À désactiver sur les ports exposés, car ils révèlent des informations sur le matériel.",
    config: `! Active CDP (propriétaire Cisco) sur tout l'équipement
cdp run
! Active LLDP (standard IEEE, compatible avec les autres constructeurs)
lldp run
interface <INTERFACE>
 ! Désactive CDP sur ce port (ex. port exposé, pour ne rien révéler)
 no cdp enable`,
    show: `show cdp neighbors
show cdp neighbors detail
show lldp neighbors
show lldp neighbors detail`,
    troubleshoot: `show cdp interface
show lldp interface`,
    debug: ``,
  },
  {
    name: "SSH",
    level: "CCNA",
    category: "sec",
    prompt: "R1",
    description:
      "SSH permet d'administrer un équipement à distance de façon chiffrée, contrairement à Telnet qui envoie tout, mots de passe compris, en clair. Avant de l'activer, il faut un nom d'hôte, un nom de domaine, une paire de clés RSA et un compte utilisateur.",
    config: `! Nom de domaine, nécessaire pour générer les clés (le hostname doit aussi avoir été changé)
ip domain-name <DOMAIN>
! Génère la paire de clés RSA (2048 bits conseillés)
crypto key generate rsa modulus 2048
! Compte local pour se connecter
username <USER> secret <PASSWORD>
! Impose SSH version 2, plus sûre
ip ssh version 2
! Lignes d'accès distant (0 à 15 = 16 sessions simultanées)
line vty 0 15
 ! Autorise uniquement SSH, pas Telnet
 transport input ssh
 ! Authentifie avec les comptes locaux
 login local`,
    show: `show ip ssh
show ssh
show crypto key mypubkey rsa`,
    troubleshoot: `show line vty 0 15
show ip ssh`,
    debug: `debug ip ssh`,
  },
  {
    name: "Port Security",
    level: "CCNA",
    category: "sec",
    prompt: "SW1",
    description:
      "La sécurité de port limite quels équipements peuvent se brancher sur un port de switch, d'après leur adresse MAC. Elle empêche l'ajout d'un switch ou d'un PC non prévu et limite les attaques par saturation de la table MAC. En cas de violation, le port peut se couper, rejeter les trames ou seulement journaliser.",
    config: `interface <INTERFACE>
 ! Le port doit être en mode access (la sécurité de port ne marche pas en mode dynamique)
 switchport mode access
 ! Active la sécurité de port
 switchport port-security
 ! Nombre maximal d'adresses MAC autorisées sur le port
 switchport port-security maximum 2
 ! Apprend les MAC vues sur le port et les enregistre dans la configuration
 switchport port-security mac-address sticky
 ! En cas de violation, le port passe en err-disabled (coupé)
 switchport port-security violation shutdown`,
    show: `show port-security
show port-security interface <INTERFACE>
show port-security address`,
    troubleshoot: `show interfaces status err-disabled
show errdisable recovery`,
    debug: ``,
  },
  {
    name: "DHCP Snooping / DAI",
    level: "CCNA",
    category: "sec",
    prompt: "SW1",
    description:
      "Le DHCP snooping bloque les faux serveurs DHCP en n'autorisant les réponses que sur les ports de confiance, et construit une table associant IP, MAC et port. DAI s'appuie sur cette table pour rejeter les paquets ARP falsifiés, ce qui protège contre l'ARP spoofing et les attaques de type man-in-the-middle.",
    config: `! Active le DHCP snooping : le switch contrôle les messages DHCP
ip dhcp snooping
! VLAN à protéger
ip dhcp snooping vlan <VLAN_ID>
! Active l'inspection ARP dynamique (DAI) sur ce VLAN : vérifie les couples IP/MAC
ip arp inspection vlan <VLAN_ID>
! Port vers le serveur DHCP ou vers le reste du réseau
interface <UPLINK_INTERFACE>
 ! Port de confiance : les réponses DHCP y sont acceptées (les autres ports sont non fiables)
 ip dhcp snooping trust
 ! Port de confiance pour l'ARP : il n'est pas inspecté
 ip arp inspection trust`,
    show: `show ip dhcp snooping
show ip dhcp snooping binding
show ip arp inspection
show ip arp inspection interfaces`,
    troubleshoot: `show ip arp inspection statistics
show interfaces status err-disabled`,
    debug: `debug ip dhcp snooping event
debug ip arp inspection`,
  },
  {
    name: "EIGRP",
    level: "ENCOR",
    category: "",
    prompt: "R1",
    description:
      "EIGRP est un protocole de routage propriétaire Cisco, de type vecteur de distance avancé. Il calcule la meilleure route avec une métrique composite (bande passante et délai) et garde une route de secours (feasible successor) pour basculer très vite. Les voisins doivent partager le même numéro d'AS.",
    config: `! Lance EIGRP : le numéro d'AS doit être identique chez les voisins
router eigrp <AS_NUMBER>
 ! Identifiant du routeur
 eigrp router-id <ROUTER_ID>
 ! Interfaces concernées par EIGRP (réseau et wildcard)
 network <NETWORK> <WILDCARD>
 ! N'envoie pas de messages EIGRP vers cette interface (ex. côté LAN)
 passive-interface <INTERFACE>
 ! Désactive le résumé automatique des réseaux par classe
 no auto-summary`,
    show: `show ip eigrp neighbors
show ip eigrp topology
show ip route eigrp
show ip protocols`,
    troubleshoot: `show ip eigrp neighbors
show ip eigrp interfaces
show ip eigrp topology all-links`,
    debug: `debug eigrp packets
debug ip eigrp`,
  },
  {
    name: "BGP",
    level: "ENCOR",
    category: "",
    prompt: "R1",
    description:
      "BGP est le protocole de routage d'Internet : il échange les routes entre systèmes autonomes (AS), par exemple entre un opérateur et ses clients. Il choisit les routes selon des politiques (attributs, préférences) plutôt que selon la vitesse. eBGP relie des AS différents, iBGP des routeurs d'un même AS.",
    config: `! Lance BGP avec le numéro de ton système autonome (AS)
router bgp <LOCAL_AS>
 ! Identifiant du routeur
 bgp router-id <ROUTER_ID>
 ! Déclare un voisin et son AS : eBGP si l'AS est différent, iBGP s'il est identique
 neighbor <PEER_IP> remote-as <REMOTE_AS>
 ! Annonce ce réseau (il doit déjà être dans la table de routage)
 network <NETWORK> mask <SUBNET_MASK>`,
    show: `show ip bgp summary
show ip bgp
show ip bgp neighbors
show ip route bgp`,
    troubleshoot: `show ip bgp summary
show ip bgp neighbors <PEER_IP> advertised-routes
show ip bgp neighbors <PEER_IP> received-routes`,
    debug: `debug ip bgp updates
debug ip bgp events
clear ip bgp <PEER_IP> soft`,
  },
  {
    name: "Route Maps / Redistribution",
    level: "ENCOR",
    category: "",
    prompt: "R1",
    description:
      "La redistribution injecte les routes apprises par un protocole (par exemple EIGRP) dans un autre (par exemple OSPF) pour relier deux domaines de routage. Une route-map sert à filtrer et à modifier ces routes (métrique, tags...) au passage, afin d'éviter les boucles et les annonces non voulues.",
    config: `! Route-map : règles évaluées dans l'ordre (10, 20...), sur le principe « si condition, alors action »
route-map <MAP_NAME> permit 10
 ! Condition : ne concerne que les routes autorisées par cette ACL
 match ip address <ACL_NAME>
 ! Action : modifie la métrique de ces routes
 set metric <VALUE>
router ospf <PROCESS_ID>
 ! Injecte dans OSPF les routes EIGRP en appliquant la route-map ; subnets inclut les sous-réseaux
 redistribute eigrp <AS_NUMBER> subnets route-map <MAP_NAME>`,
    show: `show route-map
show ip protocols
show ip route`,
    troubleshoot: `show route-map <MAP_NAME>
show ip ospf database external`,
    debug: ``,
  },
  {
    name: "VRF",
    level: "ENCOR",
    category: "",
    prompt: "R1",
    description:
      "Une VRF crée plusieurs tables de routage séparées sur un même routeur, comme des routeurs virtuels isolés. On peut ainsi héberger des clients ou des services différents, même avec des plages d'adresses qui se chevauchent, sans qu'ils puissent communiquer entre eux. Les commandes de test doivent préciser la VRF.",
    config: `! Crée une table de routage indépendante (VRF)
vrf definition <VRF_NAME>
 ! Active IPv4 dans cette VRF
 address-family ipv4
interface <INTERFACE>
 ! Place l'interface dans la VRF (à faire avant l'adresse IP, qui est effacée sinon)
 vrf forwarding <VRF_NAME>
 ip address <IP_ADDRESS> <SUBNET_MASK>`,
    show: `show vrf
show ip route vrf <VRF_NAME>
show ip interface brief vrf <VRF_NAME>`,
    troubleshoot: `ping vrf <VRF_NAME> <IP_ADDRESS>
traceroute vrf <VRF_NAME> <IP_ADDRESS>`,
    debug: ``,
  },
  {
    name: "NTP / Syslog / SNMP",
    level: "CCNA",
    category: "svc",
    prompt: "R1",
    description:
      "Ces trois services servent à exploiter le réseau : NTP garde les horloges synchronisées, Syslog centralise les messages des équipements et SNMP permet à un outil de supervision de lire leur état. Sans heure exacte, les journaux de plusieurs équipements ne peuvent pas être comparés lors d'un incident.",
    config: `! NTP : se synchronise sur un serveur de temps
ntp server <NTP_SERVER_IP>
! Syslog : envoie les journaux à un serveur central
logging host <SYSLOG_IP>
! Niveau minimal des messages envoyés (informational = 6)
logging trap informational
! Horodate chaque message de log avec la date, l'heure et les millisecondes
service timestamps log datetime msec
! SNMP : communauté en lecture seule (ro) pour la supervision ; préfère SNMPv3 en production
snmp-server community <COMMUNITY> ro`,
    show: `show ntp status
show ntp associations
show logging
show snmp`,
    troubleshoot: `show clock detail
show ntp associations detail`,
    debug: `debug ntp packets`,
  },
  {
    name: "AAA / RADIUS / TACACS+",
    level: "ENCOR",
    category: "sec",
    prompt: "R1",
    description:
      "AAA centralise la gestion des accès : Authentication (qui es-tu ?), Authorization (que peux-tu faire ?) et Accounting (qu'as-tu fait ?). RADIUS et TACACS+ relient l'équipement à un serveur central, pour ne pas gérer de comptes sur chaque machine. Garde toujours un compte local de secours.",
    config: `! Active le modèle AAA
aaa new-model
! Déclare le serveur RADIUS
radius server <NAME>
 ! Adresse du serveur et ports d'authentification et de comptabilité
 address ipv4 <SERVER_IP> auth-port 1812 acct-port 1813
 ! Secret partagé avec le serveur
 key <SECRET>
! Connexion : essaie RADIUS, puis les comptes locaux si le serveur ne répond pas
aaa authentication login default group radius local`,
    show: `show aaa servers
show radius statistics
show running-config | section aaa`,
    troubleshoot: `test aaa group radius <USER> <PASSWORD> new-code`,
    debug: `debug aaa authentication
debug radius`,
  },
  {
    name: "PVLAN",
    level: "ENCOR",
    category: "",
    prompt: "SW1",
    description:
      "Un PVLAN (Private VLAN) isole les ports d'un même VLAN entre eux, tout en leur permettant de communiquer avec un port promiscuous. Il sert à héberger plusieurs clients sur un même VLAN sans qu'ils puissent se parler, par exemple dans un datacenter ou un hôtel.",
    config: `! Crée le VLAN primaire et le VLAN secondaire (isolé ou communautaire)
vlan <PRIMARY_VLAN>
 private-vlan primary
vlan <SECONDARY_VLAN>
 private-vlan isolated
! Associe le VLAN secondaire au VLAN primaire
vlan <PRIMARY_VLAN>
 private-vlan association <SECONDARY_VLAN>
! Configure le port promiscuous : il peut parler à tous les ports du PVLAN
interface <PROMISCUOUS_INTERFACE>
 switchport mode private-vlan promiscuous
 switchport private-vlan mapping <SECONDARY_VLAN>
! Configure le port isolé : il ne peut parler qu'au port promiscuous
interface <ISOLATED_INTERFACE>
 switchport mode private-vlan host
 switchport private-vlan host-association <PRIMARY_VLAN> <SECONDARY_VLAN>`,
    show: `show vlan private-vlan
show interfaces <INTERFACE> switchport
show mac address-table`,
    troubleshoot: `show vlan private-vlan
show interfaces <INTERFACE> switchport
show mac address-table`,
    debug: ``,
  },
  {
    name: VOIP,
    level: "ENCOR",
    category: "svc",
    prompt: "SW1",
    description:
      "La VoIP (Voice over IP) transporte la voix sur le réseau IP. Elle nécessite une qualité de service (QoS) pour que la voix ne soit pas dégradée par le trafic de données. Les VLANs séparés pour la voix et les données, ainsi que la priorisation des paquets voix, sont des pratiques courantes.",
    config: `! Crée un VLAN pour la voix
vlan <VOICE_VLAN>
 name Voice
! Configure le port pour la VoIP : mode access et VLAN voix
interface <INTERFACE>
 switchport mode access
 switchport access vlan <DATA_VLAN>
 switchport voice vlan <VOICE_VLAN>
! Configure le port pour la VoIP : mode trunk et VLAN voix
interface <INTERFACE>
 switchport mode trunk
 switchport trunk native vlan <DATA_VLAN>
 switchport trunk allowed vlan <DATA_VLAN>,<VOICE_VLAN>
 switchport voice vlan <VOICE_VLAN>
! Active QoS pour prioriser les paquets voix
mls qos`,
    show: `show vlan brief
show interfaces <INTERFACE> switchport
show mls qos interface`,
    troubleshoot: `show vlan brief
show interfaces <INTERFACE> switchport
show mls qos interface`,
    debug: ``,
  }
];
