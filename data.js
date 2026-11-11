/*
 * DONNÉES : une entrée par technologie. Pour en ajouter une, copie un bloc.
 *   name, description : texte affiché sur la fiche
 *   level    : "CCNA" ou "ENCOR" (onglets CCNA / CCNP ENCOR)
 *   category : "" ou "sec" (Security) ou "svc" (Services)
 *   prompt   : équipement affiché dans le prompt : "R1" (routeur) ou "SW1" (switch)
 *   config, show, troubleshoot, debug : une commande par ligne.
 *   Les <VARIABLES> en majuscules sont surlignées et acceptent n'importe quelle valeur à l'entraînement.
 *
 * ONGLET GUIDE (facultatif) : une fiche n'apparaît dans le Guide que si elle a un champ guide.
 *   id       : identifiant court, utilisé dans l'URL (#guide/vlan) et dans les requires
 *   requires : ids des protocoles à configurer avant, dans l'ordre (ex. ["vlan", "trunk"])
 *              « Utilisé par » est calculé automatiquement à partir des requires des autres fiches.
 *   guide.steps : liste d'étapes, chacune avec :
 *     title   : titre de l'étape
 *     level   : "req" (obligatoire), "reco" (recommandé) ou "opt" (optionnel)
 *     note    : explication (facultatif)
 *     config  : commandes, une par ligne (mode configuration)
 *     verify  : commandes de vérification (facultatif)
 *     prompt  : équipement, si différent de celui de la fiche (facultatif)
 *     section : titre de groupe affiché avant l'étape, ex. "Méthode 1" (facultatif)
 *   guide.pitfalls : liste des pièges courants
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
    id: "basic",
    requires: [],
    guide: {
      steps: [
        {
          title: "Nommer l'équipement",
          level: "req",
          note: "Le nom apparaît dans le prompt, dans les logs et chez les voisins CDP : il évite de se tromper d'équipement.",
          config: `hostname <HOSTNAME>`,
          verify: `show running-config | include hostname`,
        },
        {
          title: "Protéger le mode privilégié",
          level: "req",
          note: "enable secret stocke un hash. N'utilise jamais enable password, stocké en clair.",
          config: `enable secret <PASSWORD>
! Masque les mots de passe restés en clair (chiffrement faible, type 7)
service password-encryption`,
          verify: `show running-config | include secret|password`,
        },
        {
          title: "Créer un compte administrateur local",
          level: "reco",
          note: "Indispensable pour login local (console, SSH) : chaque accès se fait avec un nom d'utilisateur.",
          config: `username <USERNAME> privilege 15 secret <PASSWORD>
! Refuse les mots de passe trop courts
security passwords min-length 10`,
          verify: `show running-config | include username`,
        },
        {
          title: "Sécuriser la console",
          level: "req",
          note: "Demande un identifiant sur le port console et ferme la session après 10 minutes d'inactivité. En lab, exec-timeout 0 0 évite les déconnexions, mais pas en production.",
          config: `line console 0
 login local
 exec-timeout 10 0
 logging synchronous`,
          verify: `show running-config | section line con`,
        },
        {
          title: "Restreindre les lignes VTY à SSH",
          level: "reco",
          note: "Telnet circule en clair : on n'autorise que SSH. Les clés SSH et le nom de domaine sont à configurer en plus (fiche SSH).",
          config: `line vty 0 15
 login local
 transport input ssh
 exec-timeout 10 0`,
          verify: `show running-config | section line vty`,
        },
        {
          title: "Afficher une bannière légale",
          level: "reco",
          note: "Prévient que l'accès est réservé : utile juridiquement en cas d'intrusion.",
          config: `banner motd #Acces reserve au personnel autorise#`,
        },
        {
          title: "Confort de la CLI",
          level: "opt",
          note: "Sans cette ligne, une faute de frappe est prise pour un nom d'hôte et IOS bloque plusieurs secondes à essayer de le résoudre.",
          config: `no ip domain-lookup`,
        },
        {
          title: "Sauvegarder la configuration",
          level: "req",
          note: "La running-config est en RAM : sans sauvegarde, tout est perdu au redémarrage. do permet de lancer une commande du mode privilégié depuis le mode configuration.",
          config: `do copy running-config startup-config`,
          verify: `show startup-config`,
        },
      ],
      pitfalls: [
        "Oublier de sauvegarder : un redémarrage ou une coupure de courant efface toute la configuration.",
        "Utiliser enable password au lieu de enable secret : le mot de passe est stocké en clair.",
        "Compter sur service password-encryption : le type 7 se déchiffre en quelques secondes, il ne protège que des regards par-dessus l'épaule.",
        "Mettre login local sans avoir créé de username : plus personne ne peut s'authentifier sur les lignes VTY.",
        "Laisser exec-timeout 0 0 en production : une session oubliée reste ouverte indéfiniment.",
      ],
    },
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
    id: "interfaces",
    requires: ["basic"],
    guide: {
      steps: [
        {
          title: "Sélectionner et documenter le port",
          level: "req",
          note: "La description dit à quoi sert le port (équipement en face, lien) : elle s'affiche dans show interfaces description.",
          config: `interface <INTERFACE>
 description <TEXT>`,
          verify: `show interfaces description`,
        },
        {
          title: "Configurer l'adresse IP",
          level: "req",
          note: "Sur un routeur. Sur un switch de niveau 2, l'adresse se met sur une SVI (interface vlan), pas sur un port physique.",
          config: `interface <INTERFACE>
 ip address <IP_ADDRESS> <SUBNET_MASK>`,
          verify: `show ip interface brief`,
        },
        {
          title: "Activer l'interface",
          level: "req",
          note: "Les interfaces d'un routeur sont éteintes par défaut. Attendu : Status up et Protocol up.",
          config: `interface <INTERFACE>
 no shutdown`,
          verify: `show ip interface brief`,
        },
        {
          title: "Vitesse et duplex",
          level: "opt",
          note: "auto par défaut. Si tu les fixes à la main, fais-le des deux côtés du lien avec les mêmes valeurs.",
          config: `interface <INTERFACE>
 speed auto
 duplex auto`,
          verify: `show interfaces <INTERFACE> | include duplex`,
        },
        {
          title: "Créer une loopback",
          level: "opt",
          note: "Interface virtuelle toujours up : idéale comme adresse de management et comme router-id (OSPF, BGP).",
          config: `interface loopback 0
 ip address <IP_ADDRESS> 255.255.255.255`,
          verify: `show ip interface brief | include Loopback`,
        },
        {
          title: "Éteindre les ports inutilisés",
          level: "reco",
          prompt: "SW1",
          note: "Sur un switch, tous les ports sont actifs par défaut : n'importe qui peut brancher un équipement. interface range configure plusieurs ports d'un coup.",
          config: `interface range <INTERFACE_RANGE>
 description UNUSED
 shutdown`,
          verify: `show interfaces status`,
        },
      ],
      pitfalls: [
        "Oublier no shutdown sur un routeur : l'interface reste administratively down.",
        "Duplex différent des deux côtés : le lien monte mais il est lent, avec des erreurs (late collisions, CRC).",
        "Deux interfaces d'un même routeur dans le même sous-réseau : IOS refuse la seconde (% ... overlaps with ...).",
        "Status up mais Protocol down : souvent un problème de couche 2 (encapsulation, keepalive, câble ou équipement en face).",
      ],
    },
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
    id: "vlan",
    requires: ["basic"],
    guide: {
      steps: [
        {
          title: "Créer les VLAN",
          level: "req",
          note: "Un nom clair (USERS, VOIX, SERVEURS) facilite le dépannage. Les VLAN sont enregistrés dans vlan.dat, en flash.",
          config: `vlan <VLAN_ID>
 name <VLAN_NAME>`,
          verify: `show vlan brief`,
        },
        {
          title: "Affecter les ports d'accès",
          level: "req",
          note: "Un port d'accès appartient à un seul VLAN : c'est le cas des PC, imprimantes et téléphones sans voice VLAN.",
          config: `interface <INTERFACE>
 switchport mode access
 switchport access vlan <VLAN_ID>`,
          verify: `show vlan brief
show interfaces <INTERFACE> switchport`,
        },
        {
          title: "Désactiver la négociation DTP",
          level: "reco",
          note: "Empêche un équipement branché sur le port de négocier un trunk (attaque switch spoofing).",
          config: `interface <INTERFACE>
 switchport nonegotiate`,
          verify: `show interfaces <INTERFACE> switchport | include Negotiation`,
        },
        {
          title: "PortFast et BPDU Guard sur les ports utilisateurs",
          level: "reco",
          note: "PortFast fait passer le port en forwarding immédiatement (pas d'attente STP au branchement d'un PC). BPDU Guard coupe le port si un switch y est branché. Détails dans la fiche STP.",
          config: `interface <INTERFACE>
 spanning-tree portfast
 spanning-tree bpduguard enable`,
          verify: `show spanning-tree interface <INTERFACE> detail`,
        },
        {
          title: "Isoler les ports inutilisés dans un VLAN « parking »",
          level: "reco",
          note: "Un port oublié ne doit donner accès à aucun réseau : on le met dans un VLAN qui ne sert à rien, et on l'éteint.",
          config: `vlan <PARKING_VLAN>
 name PARKING
interface range <INTERFACE_RANGE>
 switchport mode access
 switchport access vlan <PARKING_VLAN>
 shutdown`,
          verify: `show vlan brief`,
        },
        {
          title: "VLAN et adresse de management",
          level: "reco",
          note: "Pour administrer le switch à distance : une SVI dans un VLAN dédié (pas le VLAN 1) et une passerelle par défaut.",
          config: `vlan <MGMT_VLAN>
 name MGMT
interface vlan <MGMT_VLAN>
 ip address <IP_ADDRESS> <SUBNET_MASK>
 no shutdown
ip default-gateway <GATEWAY_IP>`,
          verify: `show ip interface brief | include Vlan`,
        },
      ],
      pitfalls: [
        "Laisser les utilisateurs ou le management dans le VLAN 1 : c'est le VLAN par défaut de tous les ports, la première cible d'une attaque.",
        "switchport access vlan sur un VLAN qui n'existe pas : le switch le crée automatiquement, sans nom (% Access VLAN does not exist. Creating vlan ...).",
        "Les VLAN sont dans vlan.dat et pas dans la startup-config : un write erase ne les supprime pas, il faut aussi delete flash:vlan.dat.",
        "Une SVI reste down tant qu'aucun port actif n'appartient à son VLAN (ou qu'aucun trunk ne le transporte).",
      ],
    },
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
    id: "trunk",
    requires: ["vlan"],
    guide: {
      steps: [
        {
          title: "Passer le port en trunk",
          level: "req",
          note: "La ligne encapsulation n'existe que sur les switchs qui gèrent aussi ISL (ex. 3560) : sur un 2960 elle est refusée, c'est normal.",
          config: `interface <INTERFACE>
 description TRUNK vers <TEXT>
 switchport trunk encapsulation dot1q
 switchport mode trunk`,
          verify: `show interfaces trunk`,
        },
        {
          title: "Désactiver la négociation DTP",
          level: "reco",
          note: "Le trunk est forcé des deux côtés : la négociation ne sert plus à rien et ouvre la porte au switch spoofing.",
          config: `interface <INTERFACE>
 switchport nonegotiate`,
          verify: `show interfaces <INTERFACE> switchport | include Negotiation`,
        },
        {
          title: "Limiter les VLAN autorisés",
          level: "reco",
          note: "Par défaut, tous les VLAN passent. Pour en ajouter un plus tard, utilise add, sinon la liste est remplacée.",
          config: `interface <INTERFACE>
 switchport trunk allowed vlan <VLAN_LIST>
! Plus tard, pour ajouter un VLAN sans effacer les autres :
 switchport trunk allowed vlan add <VLAN_ID>`,
          verify: `show interfaces trunk`,
        },
        {
          title: "Utiliser un VLAN natif dédié et inutilisé",
          level: "reco",
          note: "Les trames du VLAN natif passent sans étiquette. Un VLAN natif qui ne sert à rien protège du VLAN hopping par double tag. Il doit être identique aux deux extrémités.",
          config: `vlan <NATIVE_VLAN>
 name NATIVE
interface <INTERFACE>
 switchport trunk native vlan <NATIVE_VLAN>`,
          verify: `show interfaces trunk`,
        },
        {
          title: "Étiqueter aussi le VLAN natif",
          level: "opt",
          note: "Commande globale : même les trames du VLAN natif reçoivent un tag 802.1Q. Elle n'existe pas sur tous les modèles.",
          config: `vlan dot1q tag native`,
          verify: `show vlan dot1q tag native`,
        },
      ],
      pitfalls: [
        "VLAN natif différent des deux côtés : les trafics se mélangent entre VLAN et CDP affiche %CDP-4-NATIVE_VLAN_MISMATCH.",
        "switchport trunk allowed vlan sans add : la nouvelle liste remplace l'ancienne et coupe les autres VLAN.",
        "Un VLAN autorisé sur le trunk mais pas créé sur le switch n'est pas transmis (absent de la ligne active de show interfaces trunk).",
        "Deux ports en dynamic auto : aucun ne prend l'initiative, le trunk ne monte jamais.",
      ],
    },
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
    id: "intervlan",
    requires: ["vlan", "trunk"],
    guide: {
      steps: [
        {
          section: "Méthode 1 : router-on-a-stick (un routeur, un lien trunk)",
          title: "Activer l'interface physique du routeur",
          level: "req",
          prompt: "R1",
          note: "Pas d'adresse IP sur l'interface physique : elles vont sur les sous-interfaces. Côté switch, le port vers le routeur doit être un trunk (voir le prérequis Trunk).",
          config: `interface GigabitEthernet0/0
 no shutdown`,
          verify: `show ip interface brief`,
        },
        {
          title: "Créer une sous-interface par VLAN",
          level: "req",
          prompt: "R1",
          note: "Seul le numéro de encapsulation dot1Q compte. Garde le même numéro de sous-interface que le VLAN pour s'y retrouver. L'adresse IP est la passerelle des machines du VLAN.",
          config: `interface GigabitEthernet0/0.<VLAN_ID>
 description Passerelle VLAN <VLAN_ID>
 encapsulation dot1Q <VLAN_ID>
 ip address <IP_ADDRESS> <SUBNET_MASK>`,
          verify: `show ip interface brief
show ip route connected`,
        },
        {
          title: "Déclarer le VLAN natif",
          level: "opt",
          prompt: "R1",
          note: "Seulement si le VLAN natif du trunk doit être routé. Le mot-clé native doit correspondre au VLAN natif configuré sur le switch.",
          config: `interface GigabitEthernet0/0.<NATIVE_VLAN>
 encapsulation dot1Q <NATIVE_VLAN> native`,
        },
        {
          section: "Méthode 2 : switch de niveau 3 (SVI)",
          title: "Activer le routage IP",
          level: "req",
          prompt: "SW1",
          note: "Sans cette commande, un switch L3 ne route pas : les SVI ne servent qu'au management.",
          config: `ip routing`,
          verify: `show ip route`,
        },
        {
          title: "Créer une SVI par VLAN",
          level: "req",
          prompt: "SW1",
          note: "L'adresse IP de la SVI est la passerelle des machines du VLAN. La SVI ne monte que si le VLAN existe et a au moins un port actif.",
          config: `interface vlan <VLAN_ID>
 description Passerelle VLAN <VLAN_ID>
 ip address <IP_ADDRESS> <SUBNET_MASK>
 no shutdown`,
          verify: `show ip interface brief | include Vlan
show ip route connected`,
        },
        {
          title: "Lien routé vers le routeur ou l'extérieur",
          level: "opt",
          prompt: "SW1",
          note: "no switchport transforme le port en port routé, comme une interface de routeur. Ajoute ensuite une route par défaut ou un protocole de routage.",
          config: `interface <INTERFACE>
 no switchport
 ip address <IP_ADDRESS> <SUBNET_MASK>
 no shutdown`,
          verify: `show ip interface brief`,
        },
      ],
      pitfalls: [
        "Oublier ip routing sur le switch L3 : les SVI sont up, mais rien n'est routé entre les VLAN.",
        "Les machines n'ont pas la bonne passerelle : elle doit être l'IP de la sous-interface ou de la SVI de leur VLAN.",
        "VLAN non autorisé sur le trunk vers le routeur : la sous-interface est up mais ne reçoit rien.",
        "SVI down : le VLAN n'existe pas sur le switch, ou aucun port actif n'y est affecté.",
        "Erreur de numéro dans encapsulation dot1Q : le trafic du VLAN arrive sur la mauvaise sous-interface.",
      ],
    },
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
    id: "stp",
    requires: ["vlan"],
    guide: {
      steps: [
        {
          title: "Passer en Rapid PVST+",
          level: "req",
          note: "Convergence en quelques secondes au lieu de 30 à 50 s. À configurer sur tous les switchs du réseau.",
          config: `spanning-tree mode rapid-pvst`,
          verify: `show spanning-tree summary`,
        },
        {
          title: "Choisir le switch racine",
          level: "req",
          note: "Sans réglage, la racine est le switch à la plus petite adresse MAC, souvent le plus ancien. Place-la sur le switch central (cœur ou distribution).",
          config: `spanning-tree vlan <VLAN_LIST> root primary`,
          verify: `show spanning-tree root`,
        },
        {
          title: "Désigner une racine de secours",
          level: "reco",
          prompt: "SW2",
          note: "Si la racine tombe, c'est ce switch qui prend le relais, et pas un switch d'accès au hasard.",
          config: `spanning-tree vlan <VLAN_LIST> root secondary`,
          verify: `show spanning-tree root`,
        },
        {
          title: "PortFast et BPDU Guard sur les ports d'accès",
          level: "reco",
          note: "PortFast : le port passe tout de suite en forwarding. BPDU Guard : le port est coupé (err-disabled) si un switch y est branché.",
          config: `interface range <INTERFACE_RANGE>
 spanning-tree portfast
 spanning-tree bpduguard enable`,
          verify: `show spanning-tree interface <INTERFACE> detail`,
        },
        {
          title: "Ou bien : PortFast et BPDU Guard par défaut",
          level: "opt",
          note: "Même effet, appliqué automatiquement à tous les ports en mode access.",
          config: `spanning-tree portfast default
spanning-tree portfast bpduguard default`,
          verify: `show spanning-tree summary`,
        },
        {
          title: "Root Guard vers les switchs d'accès",
          level: "opt",
          note: "Sur les ports de la racine qui descendent vers l'accès : un switch d'accès ne pourra jamais devenir racine.",
          config: `interface <INTERFACE>
 spanning-tree guard root`,
          verify: `show spanning-tree inconsistentports`,
        },
        {
          title: "Réactivation automatique des ports coupés",
          level: "opt",
          note: "Un port mis en err-disabled par BPDU Guard se réactive seul après 300 secondes.",
          config: `errdisable recovery cause bpduguard
errdisable recovery interval 300`,
          verify: `show errdisable recovery`,
        },
      ],
      pitfalls: [
        "Ne pas choisir la racine : le trafic passe par un vieux switch d'accès, avec des chemins sous-optimaux.",
        "Activer PortFast sur un port relié à un autre switch : risque de boucle le temps que STP réagisse.",
        "La priorité doit être un multiple de 4096 (0, 4096, 8192...) : les autres valeurs sont refusées.",
        "Un port coupé par BPDU Guard ne revient pas tout seul : shutdown puis no shutdown, ou errdisable recovery.",
      ],
    },
  },
  {
    name: "EtherChannel / LACP / PAgP",
    level: "CCNA",
    category: "",
    prompt: "SW1",
    description:
      "L'EtherChannel regroupe plusieurs liens physiques en un seul lien logique : plus de bande passante et de la redondance. STP le voit comme un seul lien, donc aucun port n'est bloqué. LACP (standard IEEE 802.3ad) ou PAgP (propriétaire Cisco) négocie le groupe avec l'autre équipement ; les deux côtés doivent utiliser le même protocole et les paramètres des ports doivent être identiques des deux côtés.",
    config: `! Sélectionne tous les ports physiques à regrouper
interface range <INTERFACE_RANGE>
 ! Les place dans le groupe ; active = ce switch propose LACP à l'autre extrémité
 channel-group <ID> mode active
 ! Variante PAgP (Cisco uniquement) : channel-group <ID> mode desirable
! Interface logique créée automatiquement : les réglages (trunk, VLAN...) se font ici
interface port-channel <ID>
 switchport mode trunk`,
    show: `show etherchannel summary
show interfaces port-channel <ID>
show etherchannel port-channel`,
    troubleshoot: `show etherchannel summary
show lacp neighbor
show pagp neighbor
show running-config interface <INTERFACE>`,
    debug: `debug lacp packet
debug pagp packet
debug etherchannel`,
    id: "etherchannel",
    requires: ["trunk"],
    guide: {
      steps: [
        {
          title: "Éteindre les ports membres pendant la configuration",
          level: "reco",
          note: "Évite qu'un port monte avant que les deux côtés soient prêts, ce qui peut le mettre en err-disabled. Les ports doivent avoir la même vitesse et le même duplex.",
          config: `interface range <INTERFACE_RANGE>
 shutdown`,
        },
        {
          section: "Méthode 1 : LACP (standard IEEE 802.3ad)",
          title: "Regrouper les ports avec LACP",
          level: "req",
          note: "active : ce switch propose LACP. passive : il attend que l'autre côté le propose. Au moins un des deux côtés doit être en active. À privilégier : fonctionne avec tous les constructeurs.",
          config: `interface range <INTERFACE_RANGE>
 channel-group <ID> mode active`,
          verify: `show etherchannel summary
show lacp neighbor`,
        },
        {
          section: "Méthode 2 : PAgP (propriétaire Cisco)",
          title: "Regrouper les ports avec PAgP",
          level: "req",
          note: "desirable : ce switch propose PAgP. auto : il attend que l'autre côté le propose. Au moins un des deux côtés doit être en desirable. Seulement entre équipements Cisco.",
          config: `interface range <INTERFACE_RANGE>
 channel-group <ID> mode desirable`,
          verify: `show etherchannel summary
show pagp neighbor`,
        },
        {
          section: "Ensuite, quelle que soit la méthode",
          title: "Configurer l'interface port-channel",
          level: "req",
          note: "Les réglages se font sur le port-channel : ils sont recopiés sur les ports membres.",
          config: `interface port-channel <ID>
 description <TEXT>
 switchport trunk encapsulation dot1q
 switchport mode trunk
 switchport nonegotiate
 switchport trunk allowed vlan <VLAN_LIST>`,
          verify: `show interfaces trunk`,
        },
        {
          title: "Rallumer les ports membres",
          level: "req",
          note: "Attendu dans show etherchannel summary : le port-channel en (SU) et chaque port en (P).",
          config: `interface range <INTERFACE_RANGE>
 no shutdown`,
          verify: `show etherchannel summary
show lacp neighbor
show pagp neighbor`,
        },
        {
          title: "Choisir la répartition de charge",
          level: "opt",
          note: "Le trafic est réparti par flux, pas par paquet. src-dst-ip répartit mieux que la valeur par défaut (souvent src-mac).",
          config: `port-channel load-balance src-dst-ip`,
          verify: `show etherchannel load-balance`,
        },
      ],
      pitfalls: [
        "Modes incompatibles : passive des deux côtés (LACP), auto des deux côtés (PAgP), ou on face à active/desirable, et le groupe ne se forme pas.",
        "Ports membres configurés différemment (VLAN, mode, vitesse) : ils sont suspendus, (s) dans show etherchannel summary.",
        "Modifier un port membre au lieu du port-channel : la configuration n'est plus cohérente et le port sort du groupe.",
        "Mélanger LACP (active/passive) et PAgP (desirable/auto) : ce sont deux protocoles différents.",
      ],
    },
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
    id: "dhcp",
    requires: ["interfaces"],
    guide: {
      steps: [
        {
          title: "Exclure les adresses fixes",
          level: "req",
          note: "À faire avant le pool : la passerelle, les serveurs et les imprimantes ne doivent jamais être distribués.",
          config: `ip dhcp excluded-address <START_IP> <END_IP>`,
        },
        {
          title: "Créer le pool",
          level: "req",
          note: "network doit correspondre au réseau de l'interface côté clients. default-router est la passerelle des clients.",
          config: `ip dhcp pool <POOL_NAME>
 network <NETWORK> <SUBNET_MASK>
 default-router <GATEWAY_IP>
 dns-server <DNS_IP>`,
          verify: `show ip dhcp pool
show ip dhcp binding`,
        },
        {
          title: "Options supplémentaires",
          level: "opt",
          note: "Nom de domaine donné aux clients et durée du bail (en jours).",
          config: `ip dhcp pool <POOL_NAME>
 domain-name <DOMAIN>
 lease 7`,
        },
        {
          title: "Relais DHCP vers un serveur distant",
          level: "reco",
          note: "Quand le serveur DHCP est sur un autre réseau : sur l'interface passerelle des clients (interface, sous-interface ou SVI).",
          config: `interface <INTERFACE>
 ip helper-address <DHCP_SERVER_IP>`,
          verify: `show ip interface <INTERFACE> | include Helper`,
        },
        {
          title: "Routeur client DHCP",
          level: "opt",
          note: "Pour une interface côté fournisseur d'accès qui reçoit son adresse par DHCP.",
          config: `interface <INTERFACE>
 ip address dhcp
 no shutdown`,
          verify: `show ip interface brief`,
        },
      ],
      pitfalls: [
        "Oublier excluded-address : la passerelle est distribuée à un client, conflit d'adresses.",
        "Pas de default-router : les clients ont une IP mais ne sortent pas de leur réseau.",
        "ip helper-address sur la mauvaise interface : il doit être côté clients, pas côté serveur.",
        "Adresses en conflit : elles sont retirées du pool. show ip dhcp conflict, puis clear ip dhcp conflict *.",
      ],
    },
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
    id: "nat",
    requires: ["interfaces", "static"],
    guide: {
      steps: [
        {
          title: "Désigner les interfaces inside et outside",
          level: "req",
          note: "inside : côté LAN (adresses privées). outside : côté Internet.",
          config: `interface <INSIDE_INTERFACE>
 ip nat inside
interface <OUTSIDE_INTERFACE>
 ip nat outside`,
          verify: `show ip nat statistics`,
        },
        {
          title: "Lister les adresses à traduire",
          level: "req",
          note: "Une ACL standard qui désigne les réseaux internes. Évite permit any.",
          config: `ip access-list standard NAT_LAN
 permit <NETWORK> <WILDCARD>`,
          verify: `show access-lists NAT_LAN`,
        },
        {
          title: "Activer le PAT sur l'interface externe",
          level: "req",
          note: "overload : tous les clients partagent l'adresse de l'interface externe, distingués par le numéro de port.",
          config: `ip nat inside source list NAT_LAN interface <OUTSIDE_INTERFACE> overload`,
          verify: `show ip nat translations
show ip nat statistics`,
        },
        {
          title: "Publier un serveur interne (NAT statique)",
          level: "opt",
          note: "Rend un serveur interne joignable depuis Internet. La 2e forme ne redirige qu'un port (ici le web).",
          config: `ip nat inside source static <INSIDE_IP> <PUBLIC_IP>
! Ou seulement un port :
ip nat inside source static tcp <INSIDE_IP> 80 <PUBLIC_IP> 80`,
          verify: `show ip nat translations`,
        },
        {
          title: "Ou bien : pool d'adresses publiques",
          level: "opt",
          note: "Quand le fournisseur d'accès donne une plage d'adresses publiques au lieu d'une seule.",
          config: `ip nat pool <POOL_NAME> <START_IP> <END_IP> netmask <SUBNET_MASK>
ip nat inside source list NAT_LAN pool <POOL_NAME> overload`,
          verify: `show ip nat statistics`,
        },
      ],
      pitfalls: [
        "inside et outside inversés : aucune traduction n'apparaît.",
        "Pas de route par défaut vers Internet : la traduction se fait, mais les paquets ne partent nulle part.",
        "ACL avec permit any : le trafic venant d'Internet peut aussi être traduit, comportement imprévisible.",
        "Après une modification, les anciennes traductions restent : clear ip nat translation *.",
      ],
    },
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
    id: "acl",
    requires: ["interfaces"],
    guide: {
      steps: [
        {
          title: "Écrire une ACL étendue nommée",
          level: "req",
          note: "Les règles sont lues de haut en bas, la première qui correspond s'applique. Mets les plus précises en premier. remark documente l'ACL.",
          config: `ip access-list extended <ACL_NAME>
 remark <TEXT>
 permit tcp <SOURCE> <WILDCARD> host <DEST_IP> eq 22
 deny ip any any log`,
          verify: `show ip access-lists <ACL_NAME>`,
        },
        {
          title: "Appliquer l'ACL sur une interface",
          level: "req",
          note: "Une ACL étendue se place au plus près de la source, une ACL standard au plus près de la destination.",
          config: `interface <INTERFACE>
 ip access-group <ACL_NAME> in`,
          verify: `show ip interface <INTERFACE> | include access list`,
        },
        {
          title: "ACL standard (filtre sur la source seulement)",
          level: "opt",
          note: "Plus simple, mais ne regarde que l'adresse source. Sert aussi à désigner des adresses (NAT, SNMP, VTY).",
          config: `ip access-list standard <ACL_NAME>
 permit <NETWORK> <WILDCARD>`,
          verify: `show ip access-lists <ACL_NAME>`,
        },
        {
          title: "Restreindre l'accès SSH aux admins",
          level: "reco",
          note: "access-class filtre les connexions aux lignes VTY, pas le trafic qui traverse le routeur.",
          config: `ip access-list standard MGMT_ACCESS
 permit <ADMIN_NETWORK> <WILDCARD>
line vty 0 15
 access-class MGMT_ACCESS in`,
          verify: `show line vty 0`,
        },
        {
          title: "Modifier une ACL existante",
          level: "opt",
          note: "Dans une ACL nommée, chaque ligne a un numéro de séquence : on peut insérer ou supprimer une ligne sans tout réécrire.",
          config: `ip access-list extended <ACL_NAME>
 15 permit icmp any any echo-reply
 no 20`,
          verify: `show ip access-lists <ACL_NAME>`,
        },
      ],
      pitfalls: [
        "Le deny implicite : une ACL sans aucun permit bloque tout le trafic de l'interface.",
        "Wildcard ≠ masque : 0.0.0.255 pour un /24, pas 255.255.255.0.",
        "Une seule ACL par interface, par sens et par protocole : la nouvelle remplace l'ancienne.",
        "Une ACL out ne filtre pas le trafic émis par le routeur lui-même (ping, SSH sortant).",
        "Appliquer à distance une ACL qui bloque ton propre SSH : prévois un reload in 10 avant, et reload cancel après.",
      ],
    },
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
    id: "static",
    requires: ["interfaces"],
    guide: {
      steps: [
        {
          title: "Route vers un réseau distant",
          level: "req",
          note: "Le next-hop est l'adresse du routeur voisin. Pense à la route retour sur l'autre routeur.",
          config: `ip route <NETWORK> <SUBNET_MASK> <NEXT_HOP>`,
          verify: `show ip route static
ping <IP_ADDRESS>
traceroute <IP_ADDRESS>`,
        },
        {
          title: "Route par défaut",
          level: "req",
          note: "Tout ce qui n'a pas de route plus précise part par là, en général vers Internet. Elle apparaît comme Gateway of last resort.",
          config: `ip route 0.0.0.0 0.0.0.0 <NEXT_HOP>`,
          verify: `show ip route | include Gateway`,
        },
        {
          title: "Route de secours (flottante)",
          level: "opt",
          note: "Distance administrative plus haute (ici 200) : elle n'entre dans la table que si la route principale disparaît.",
          config: `ip route <NETWORK> <SUBNET_MASK> <BACKUP_NEXT_HOP> 200`,
          verify: `show running-config | include ip route`,
        },
        {
          title: "Route avec interface de sortie et next-hop",
          level: "opt",
          note: "Précise les deux : utile sur Ethernet, et la route disparaît si l'interface tombe.",
          config: `ip route <NETWORK> <SUBNET_MASK> <EXIT_INTERFACE> <NEXT_HOP>`,
          verify: `show ip route <NETWORK>`,
        },
      ],
      pitfalls: [
        "Oublier la route retour : le ping part, mais la réponse ne revient jamais.",
        "Next-hop injoignable : la route n'entre pas dans la table de routage.",
        "Route vers une interface Ethernet sans next-hop : le routeur fait de l'ARP pour chaque destination (proxy ARP).",
        "Route flottante avec une distance plus basse que la principale : c'est elle qui est utilisée en permanence.",
      ],
    },
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
    id: "ospf",
    requires: ["interfaces"],
    guide: {
      steps: [
        {
          title: "Lancer OSPF et fixer le router-id",
          level: "req",
          note: "Le router-id doit être unique. Fixe-le avant de former les voisinages, sinon il faut clear ip ospf process pour qu'il soit pris en compte.",
          config: `router ospf <PROCESS_ID>
 router-id <ROUTER_ID>`,
          verify: `show ip protocols`,
        },
        {
          title: "Activer OSPF sur les interfaces",
          level: "req",
          note: "Toutes les interfaces dont l'IP est dans le réseau participent. Alternative plus précise : la commande ip ospf directement sur l'interface.",
          config: `router ospf <PROCESS_ID>
 network <NETWORK> <WILDCARD> area <AREA>
! Ou, directement sur l'interface :
interface <INTERFACE>
 ip ospf <PROCESS_ID> area <AREA>`,
          verify: `show ip ospf neighbor
show ip ospf interface brief`,
        },
        {
          title: "Rendre passives les interfaces sans voisin",
          level: "reco",
          note: "Le réseau reste annoncé mais aucun hello n'est envoyé côté LAN : pas de voisin pirate possible.",
          config: `router ospf <PROCESS_ID>
 passive-interface <INTERFACE>`,
          verify: `show ip protocols`,
        },
        {
          title: "Liens point-à-point",
          level: "opt",
          note: "Sur un lien entre deux routeurs seulement : pas d'élection DR/BDR, la contiguïté se forme plus vite.",
          config: `interface <INTERFACE>
 ip ospf network point-to-point`,
          verify: `show ip ospf interface <INTERFACE>`,
        },
        {
          title: "Annoncer la route par défaut",
          level: "opt",
          note: "Le routeur de sortie Internet la propage à tous. Il doit lui-même avoir une route par défaut (fiche Static).",
          config: `router ospf <PROCESS_ID>
 default-information originate`,
          verify: `show ip route ospf`,
        },
        {
          title: "Ajuster la bande passante de référence",
          level: "opt",
          note: "Par défaut, tout lien de 100 Mb/s ou plus a le même coût. À mettre à la même valeur sur tous les routeurs.",
          config: `router ospf <PROCESS_ID>
 auto-cost reference-bandwidth 10000`,
          verify: `show ip ospf interface brief`,
        },
        {
          title: "Authentifier les voisins",
          level: "opt",
          note: "Identique des deux côtés du lien. Empêche un routeur non autorisé de rejoindre OSPF.",
          config: `interface <INTERFACE>
 ip ospf authentication message-digest
 ip ospf message-digest-key 1 md5 <KEY>`,
          verify: `show ip ospf interface <INTERFACE>`,
        },
      ],
      pitfalls: [
        "Hello/dead timers, aire, masque ou type de réseau différents entre voisins : le voisinage ne se forme pas.",
        "Deux routeurs avec le même router-id : adjacences instables et routes manquantes.",
        "MTU différente : les voisins restent bloqués en EXSTART/EXCHANGE.",
        "passive-interface sur un lien vers un autre routeur : plus de voisin sur ce lien.",
        "Wildcard au lieu de masque (ou l'inverse) dans network : la mauvaise interface est activée.",
      ],
    },
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
    id: "hsrp",
    requires: ["interfaces"],
    guide: {
      steps: [
        {
          title: "Créer le groupe et l'IP virtuelle",
          level: "req",
          prompt: "R1",
          note: "L'IP virtuelle est la passerelle à donner aux PC. Elle est dans le même sous-réseau que l'interface, mais différente de son IP.",
          config: `interface <INTERFACE>
 standby version 2
 standby <GROUP> ip <VIRTUAL_IP>`,
          verify: `show standby brief`,
        },
        {
          title: "Priorité et préemption sur le routeur principal",
          level: "req",
          prompt: "R1",
          note: "La priorité la plus haute (100 par défaut) devient Active. preempt lui fait reprendre ce rôle quand il revient.",
          config: `interface <INTERFACE>
 standby <GROUP> priority 110
 standby <GROUP> preempt`,
          verify: `show standby brief`,
        },
        {
          title: "Configurer le routeur de secours",
          level: "req",
          prompt: "R2",
          note: "Même version, même groupe, même IP virtuelle. Attendu : R1 Active, R2 Standby.",
          config: `interface <INTERFACE>
 standby version 2
 standby <GROUP> ip <VIRTUAL_IP>
 standby <GROUP> preempt`,
          verify: `show standby brief`,
        },
        {
          title: "Suivre le lien vers Internet",
          level: "reco",
          prompt: "R1",
          note: "Si le lien WAN de R1 tombe, sa priorité baisse de 20 (110 → 90, sous les 100 de R2) et R2 devient Active.",
          config: `track 1 interface <WAN_INTERFACE> line-protocol
interface <INTERFACE>
 standby <GROUP> track 1 decrement 20`,
          verify: `show track`,
        },
        {
          title: "Authentifier HSRP",
          level: "opt",
          prompt: "R1",
          note: "Même clé sur les deux routeurs : un équipement pirate ne peut pas prendre le rôle Active.",
          config: `interface <INTERFACE>
 standby <GROUP> authentication md5 key-string <KEY>`,
          verify: `show standby`,
        },
        {
          title: "Basculement plus rapide",
          level: "opt",
          prompt: "R1",
          note: "Hello toutes les secondes, panne détectée en 3 s (au lieu de 3 s et 10 s).",
          config: `interface <INTERFACE>
 standby <GROUP> timers 1 3`,
          verify: `show standby`,
        },
      ],
      pitfalls: [
        "Les PC ont l'IP réelle d'un routeur comme passerelle au lieu de l'IP virtuelle : pas de bascule.",
        "Version ou numéro de groupe différent entre les routeurs : les deux se croient Active.",
        "Pas de preempt : après une panne, le routeur principal revient mais reste Standby.",
        "Décrément trop faible : la priorité de R1 reste au-dessus de celle de R2 et la bascule n'a pas lieu.",
      ],
    },
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
    id: "ipv6",
    requires: ["interfaces"],
    guide: {
      steps: [
        {
          title: "Activer le routage IPv6",
          level: "req",
          note: "Désactivé par défaut. Sans lui, le routeur ne route pas l'IPv6 et n'envoie pas de Router Advertisement (SLAAC impossible pour les clients).",
          config: `ipv6 unicast-routing`,
          verify: `show ipv6 interface brief`,
        },
        {
          title: "Adresse globale sur l'interface",
          level: "req",
          note: "Préfixe en /64 sur un LAN : c'est indispensable pour SLAAC.",
          config: `interface <INTERFACE>
 ipv6 address <IPV6_PREFIX>/64
 no shutdown`,
          verify: `show ipv6 interface brief`,
        },
        {
          title: "Adresse link-local lisible",
          level: "reco",
          note: "Les clients utilisent la link-local du routeur comme passerelle. FE80::1 est plus simple à lire et à dépanner que l'adresse générée.",
          config: `interface <INTERFACE>
 ipv6 address FE80::1 link-local`,
          verify: `show ipv6 interface <INTERFACE>`,
        },
        {
          title: "Ou bien : adresse EUI-64",
          level: "opt",
          note: "La partie hôte est calculée à partir de l'adresse MAC.",
          config: `interface <INTERFACE>
 ipv6 address <IPV6_PREFIX>/64 eui-64`,
          verify: `show ipv6 interface brief`,
        },
        {
          title: "Route par défaut IPv6",
          level: "reco",
          note: "Avec un next-hop link-local, il faut préciser l'interface de sortie.",
          config: `ipv6 route ::/0 <NEXT_HOP>
! Avec un next-hop link-local :
ipv6 route ::/0 <INTERFACE> FE80::2`,
          verify: `show ipv6 route`,
        },
        {
          title: "DHCPv6 stateless pour le DNS",
          level: "opt",
          note: "SLAAC donne l'adresse, DHCPv6 donne les infos en plus (DNS). other-config-flag dit aux clients de le demander.",
          config: `ipv6 dhcp pool <POOL_NAME>
 dns-server <IPV6_DNS>
interface <INTERFACE>
 ipv6 nd other-config-flag
 ipv6 dhcp server <POOL_NAME>`,
          verify: `show ipv6 dhcp pool`,
        },
        {
          title: "Routeur client SLAAC",
          level: "opt",
          note: "L'interface se configure seule à partir du préfixe annoncé par un autre routeur.",
          config: `interface <INTERFACE>
 ipv6 address autoconfig`,
          verify: `show ipv6 interface brief`,
        },
      ],
      pitfalls: [
        "Oublier ipv6 unicast-routing : les interfaces ont une adresse mais rien n'est routé, et les clients SLAAC n'ont pas d'adresse.",
        "Préfixe différent de /64 sur un LAN : SLAAC ne fonctionne pas.",
        "Route avec next-hop link-local sans interface de sortie : refusée.",
        "Bloquer tout l'ICMPv6 dans une ACL : NDP (l'équivalent d'ARP) ne fonctionne plus.",
      ],
    },
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
    id: "cdp",
    requires: ["basic"],
    guide: {
      steps: [
        {
          title: "Activer CDP",
          level: "reco",
          note: "Actif par défaut sur Cisco. Montre les voisins directs : nom, modèle, port, IP.",
          config: `cdp run`,
          verify: `show cdp neighbors
show cdp neighbors detail`,
        },
        {
          title: "Activer LLDP",
          level: "reco",
          note: "Standard IEEE, désactivé par défaut sur Cisco. Nécessaire avec des équipements d'autres marques et des téléphones IP non Cisco.",
          config: `lldp run`,
          verify: `show lldp neighbors
show lldp neighbors detail`,
        },
        {
          title: "Couper CDP et LLDP sur les ports exposés",
          level: "reco",
          note: "Sur les ports vers Internet ou vers des clients : ces protocoles révèlent le modèle, la version d'IOS et les adresses.",
          config: `interface <INTERFACE>
 no cdp enable
 no lldp transmit
 no lldp receive`,
          verify: `show cdp interface <INTERFACE>
show lldp interface <INTERFACE>`,
        },
        {
          title: "Ajuster les timers",
          level: "opt",
          note: "Fréquence d'envoi et durée de validité des informations (en secondes).",
          config: `cdp timer 60
cdp holdtime 180`,
          verify: `show cdp`,
        },
      ],
      pitfalls: [
        "Laisser CDP actif vers Internet : un attaquant connaît le modèle et la version d'IOS.",
        "Chercher un voisin LLDP sans avoir tapé lldp run : il est désactivé par défaut sur Cisco.",
        "CDP ne voit que les voisins directement connectés : pas les équipements derrière un autre switch.",
        "Couper CDP sur un port de téléphone IP Cisco : le téléphone n'apprend plus son voice VLAN.",
      ],
    },
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
    id: "ssh",
    requires: ["basic"],
    guide: {
      steps: [
        {
          title: "Nom de domaine",
          level: "req",
          note: "Les clés RSA sont nommées hostname.domaine : le hostname doit déjà avoir été changé (fiche Basic IOS).",
          config: `ip domain-name <DOMAIN>`,
        },
        {
          title: "Générer les clés RSA",
          level: "req",
          note: "2048 bits conseillés. Au moins 768 bits pour SSH version 2.",
          config: `crypto key generate rsa modulus 2048`,
          verify: `show crypto key mypubkey rsa`,
        },
        {
          title: "Imposer SSH version 2",
          level: "req",
          note: "La version 1 a des failles connues.",
          config: `ip ssh version 2`,
          verify: `show ip ssh`,
        },
        {
          title: "Compte local",
          level: "req",
          note: "Si ce n'est pas déjà fait dans Basic IOS.",
          config: `username <USERNAME> privilege 15 secret <PASSWORD>`,
          verify: `show running-config | include username`,
        },
        {
          title: "Lignes VTY en SSH uniquement",
          level: "req",
          note: "Telnet est refusé, l'authentification se fait avec les comptes locaux.",
          config: `line vty 0 15
 login local
 transport input ssh
 exec-timeout 10 0`,
          verify: `show line vty 0
show ssh`,
        },
        {
          title: "Durcir SSH",
          level: "reco",
          note: "Délai de connexion limité, peu d'essais, et blocage de 2 minutes après 3 échecs en 1 minute (contre la force brute).",
          config: `ip ssh time-out 60
ip ssh authentication-retries 3
login block-for 120 attempts 3 within 60`,
          verify: `show login`,
        },
      ],
      pitfalls: [
        "Hostname par défaut (Router ou Switch) : la génération des clés est refusée.",
        "transport input ssh avant d'avoir généré les clés : plus aucun accès distant.",
        "login local sans username : personne ne peut se connecter.",
        "Pour limiter SSH à certaines adresses, il faut une ACL avec access-class (fiche ACL).",
      ],
    },
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
    id: "portsec",
    requires: ["vlan"],
    guide: {
      steps: [
        {
          title: "Mettre le port en mode access",
          level: "req",
          note: "La sécurité de port est refusée sur un port en mode dynamique.",
          config: `interface <INTERFACE>
 switchport mode access`,
        },
        {
          title: "Activer la sécurité de port",
          level: "req",
          note: "Par défaut : 1 seule adresse MAC autorisée, et le port est coupé en cas de violation.",
          config: `interface <INTERFACE>
 switchport port-security`,
          verify: `show port-security interface <INTERFACE>`,
        },
        {
          title: "Nombre d'adresses MAC autorisées",
          level: "reco",
          note: "2 pour un PC derrière un téléphone IP (3 sur certains modèles, le téléphone pouvant compter dans les deux VLAN).",
          config: `interface <INTERFACE>
 switchport port-security maximum 2`,
          verify: `show port-security interface <INTERFACE>`,
        },
        {
          title: "Apprendre les adresses MAC (sticky)",
          level: "reco",
          note: "Les premières MAC vues sont enregistrées dans la running-config. Pense à sauvegarder.",
          config: `interface <INTERFACE>
 switchport port-security mac-address sticky`,
          verify: `show port-security address`,
        },
        {
          title: "Choisir l'action en cas de violation",
          level: "reco",
          note: "shutdown : port coupé (err-disabled). restrict : trames bloquées et journalisées, port actif. protect : bloquées sans log.",
          config: `interface <INTERFACE>
 switchport port-security violation shutdown`,
          verify: `show port-security`,
        },
        {
          title: "Réactivation automatique",
          level: "opt",
          note: "Le port coupé par une violation se réactive après 300 secondes.",
          config: `errdisable recovery cause psecure-violation
errdisable recovery interval 300`,
          verify: `show errdisable recovery`,
        },
      ],
      pitfalls: [
        "Port en mode dynamique : la commande switchport port-security est refusée.",
        "Adresses sticky non sauvegardées : elles sont perdues au redémarrage.",
        "Port en err-disabled : il faut shutdown puis no shutdown (ou errdisable recovery).",
        "maximum 1 sur un port avec téléphone IP + PC : violation immédiate.",
      ],
    },
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
    id: "dhcpsnoop",
    requires: ["vlan", "dhcp"],
    guide: {
      steps: [
        {
          title: "Activer le DHCP snooping",
          level: "req",
          note: "Les deux commandes sont nécessaires : l'activation globale et la liste des VLAN protégés.",
          config: `ip dhcp snooping
ip dhcp snooping vlan <VLAN_LIST>`,
          verify: `show ip dhcp snooping`,
        },
        {
          title: "Déclarer les ports de confiance",
          level: "req",
          note: "Seuls les ports vers le serveur DHCP ou vers le reste du réseau (uplinks) peuvent envoyer des réponses DHCP. Les autres ports sont non fiables.",
          config: `interface <UPLINK_INTERFACE>
 ip dhcp snooping trust`,
          verify: `show ip dhcp snooping`,
        },
        {
          title: "Désactiver l'insertion de l'option 82",
          level: "reco",
          note: "Si le serveur DHCP est un routeur Cisco, il rejette par défaut les requêtes où le switch a ajouté l'option 82 : les clients n'obtiennent plus d'adresse.",
          config: `no ip dhcp snooping information option`,
          verify: `show ip dhcp snooping binding`,
        },
        {
          title: "Limiter le débit DHCP des ports d'accès",
          level: "reco",
          note: "Contre l'épuisement du pool (DHCP starvation). Au-delà de 10 paquets par seconde, le port est coupé.",
          config: `interface range <INTERFACE_RANGE>
 ip dhcp snooping limit rate 10`,
          verify: `show ip dhcp snooping`,
        },
        {
          title: "Activer l'inspection ARP (DAI)",
          level: "req",
          note: "Vérifie chaque ARP avec la table de DHCP snooping : bloque l'ARP spoofing. Les uplinks sont mis en confiance.",
          config: `ip arp inspection vlan <VLAN_LIST>
interface <UPLINK_INTERFACE>
 ip arp inspection trust`,
          verify: `show ip arp inspection
show ip arp inspection interfaces`,
        },
        {
          title: "Autoriser les hôtes à IP fixe",
          level: "opt",
          note: "Un équipement en IP statique n'est pas dans la table DHCP snooping : DAI le bloque sans cette ACL ARP.",
          config: `arp access-list STATIC_HOSTS
 permit ip host <IP_ADDRESS> mac host <MAC_ADDRESS>
ip arp inspection filter STATIC_HOSTS vlan <VLAN_ID>`,
          verify: `show ip arp inspection statistics`,
        },
        {
          title: "Contrôles supplémentaires",
          level: "opt",
          note: "Vérifie aussi la cohérence entre les adresses MAC et IP de l'en-tête et celles du message ARP.",
          config: `ip arp inspection validate src-mac dst-mac ip`,
          verify: `show ip arp inspection`,
        },
      ],
      pitfalls: [
        "Oublier trust sur l'uplink : plus aucun client n'obtient d'adresse.",
        "Option 82 avec un serveur DHCP IOS : requêtes rejetées, clients sans adresse.",
        "Hôtes en IP fixe (serveurs, imprimantes) bloqués par DAI : il faut une ACL ARP.",
        "limit rate trop bas : un port légitime passe en err-disabled.",
      ],
    },
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
    id: "eigrp",
    requires: ["interfaces"],
    guide: {
      steps: [
        {
          title: "Lancer EIGRP",
          level: "req",
          note: "Le numéro d'AS doit être identique sur tous les voisins.",
          config: `router eigrp <AS_NUMBER>
 eigrp router-id <ROUTER_ID>`,
          verify: `show ip protocols`,
        },
        {
          title: "Activer EIGRP sur les interfaces",
          level: "req",
          note: "Toutes les interfaces dont l'IP est dans ce réseau participent.",
          config: `router eigrp <AS_NUMBER>
 network <NETWORK> <WILDCARD>`,
          verify: `show ip eigrp neighbors
show ip eigrp interfaces`,
        },
        {
          title: "Désactiver le résumé automatique",
          level: "reco",
          note: "Déjà désactivé par défaut depuis IOS 15, mais à vérifier : il casse les réseaux discontinus.",
          config: `router eigrp <AS_NUMBER>
 no auto-summary`,
          verify: `show ip protocols`,
        },
        {
          title: "Rendre passives les interfaces sans voisin",
          level: "reco",
          note: "Le réseau reste annoncé, mais aucun hello n'est envoyé côté LAN.",
          config: `router eigrp <AS_NUMBER>
 passive-interface default
 no passive-interface <INTERFACE>`,
          verify: `show ip protocols`,
        },
        {
          title: "Ou bien : mode nommé",
          level: "opt",
          note: "Syntaxe moderne qui regroupe toute la configuration (y compris celle des interfaces) sous le processus.",
          config: `router eigrp <NAME>
 address-family ipv4 unicast autonomous-system <AS_NUMBER>
  eigrp router-id <ROUTER_ID>
  network <NETWORK> <WILDCARD>`,
          verify: `show ip eigrp neighbors`,
        },
        {
          title: "Résumé manuel",
          level: "opt",
          note: "Annonce un seul préfixe résumé sur cette interface, au lieu de tous les sous-réseaux.",
          config: `interface <INTERFACE>
 ip summary-address eigrp <AS_NUMBER> <NETWORK> <SUBNET_MASK>`,
          verify: `show ip route eigrp`,
        },
        {
          title: "Authentifier les voisins",
          level: "opt",
          note: "Même key chain et même clé des deux côtés.",
          config: `key chain <KEYCHAIN>
 key 1
  key-string <KEY>
interface <INTERFACE>
 ip authentication mode eigrp <AS_NUMBER> md5
 ip authentication key-chain eigrp <AS_NUMBER> <KEYCHAIN>`,
          verify: `show ip eigrp neighbors`,
        },
      ],
      pitfalls: [
        "Numéro d'AS différent entre voisins : aucun voisinage.",
        "K-values ou authentification différentes : le voisinage ne se forme pas (message dans les logs).",
        "passive-interface sur un lien vers un autre routeur : plus de voisin sur ce lien.",
        "auto-summary sur un réseau discontinu : routes résumées incorrectes et trafic perdu.",
      ],
    },
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
    id: "bgp",
    requires: ["interfaces"],
    guide: {
      steps: [
        {
          title: "Lancer BGP",
          level: "req",
          note: "Un seul processus BGP par routeur, avec le numéro d'AS de ton réseau. log-neighbor-changes journalise les sessions qui montent et tombent.",
          config: `router bgp <LOCAL_AS>
 bgp router-id <ROUTER_ID>
 bgp log-neighbor-changes`,
          verify: `show ip bgp summary`,
        },
        {
          title: "Déclarer les voisins",
          level: "req",
          note: "AS différent = eBGP, même AS = iBGP. Les voisins se configurent à la main, des deux côtés. Attendu : un nombre dans la colonne State/PfxRcd.",
          config: `router bgp <LOCAL_AS>
 neighbor <PEER_IP> remote-as <REMOTE_AS>
 neighbor <PEER_IP> description <TEXT>`,
          verify: `show ip bgp summary
show ip bgp neighbors <PEER_IP>`,
        },
        {
          title: "Annoncer les réseaux",
          level: "req",
          note: "Le préfixe doit exister exactement (même masque) dans la table de routage. Sinon, crée une route vers Null0.",
          config: `router bgp <LOCAL_AS>
 network <NETWORK> mask <SUBNET_MASK>
! Si le réseau n'est pas dans la table de routage :
ip route <NETWORK> <SUBNET_MASK> Null0`,
          verify: `show ip bgp`,
        },
        {
          title: "Authentifier la session",
          level: "reco",
          note: "Mot de passe MD5 sur la session TCP, identique des deux côtés.",
          config: `router bgp <LOCAL_AS>
 neighbor <PEER_IP> password <KEY>`,
          verify: `show ip bgp neighbors <PEER_IP> | include state`,
        },
        {
          title: "Filtrer les annonces",
          level: "reco",
          note: "N'annonce que tes propres préfixes : évite de devenir un réseau de transit par erreur.",
          config: `ip prefix-list <PL_NAME> seq 5 permit <NETWORK>/<PREFIX_LEN>
router bgp <LOCAL_AS>
 neighbor <PEER_IP> prefix-list <PL_NAME> out`,
          verify: `clear ip bgp <PEER_IP> soft out
show ip bgp neighbors <PEER_IP> advertised-routes`,
        },
        {
          title: "iBGP entre loopbacks",
          level: "opt",
          note: "La session survit à la panne d'un lien. Les loopbacks doivent être joignables par l'IGP (OSPF, EIGRP). next-hop-self évite un next-hop eBGP injoignable.",
          config: `router bgp <LOCAL_AS>
 neighbor <PEER_IP> remote-as <LOCAL_AS>
 neighbor <PEER_IP> update-source Loopback0
 neighbor <PEER_IP> next-hop-self`,
          verify: `show ip bgp summary`,
        },
        {
          title: "eBGP entre loopbacks",
          level: "opt",
          note: "En eBGP, le voisin doit par défaut être directement connecté (TTL 1).",
          config: `router bgp <LOCAL_AS>
 neighbor <PEER_IP> ebgp-multihop 2
 neighbor <PEER_IP> update-source Loopback0`,
          verify: `show ip bgp summary`,
        },
      ],
      pitfalls: [
        "network avec un masque qui n'est pas exactement dans la table de routage : le préfixe n'est pas annoncé.",
        "Voisin bloqué en Active : la session TCP 179 ne s'établit pas (IP, AS, route ou ACL).",
        "iBGP : une route apprise d'un voisin iBGP n'est pas transmise aux autres. Il faut un maillage complet (ou des route reflectors).",
        "Next-hop eBGP injoignable dans l'AS : la route est dans show ip bgp mais pas dans la table de routage. Utilise next-hop-self.",
      ],
    },
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
    id: "routemap",
    requires: ["ospf", "eigrp"],
    guide: {
      steps: [
        {
          title: "Sélectionner les routes",
          level: "req",
          note: "Une prefix-list est plus précise qu'une ACL pour désigner des réseaux (préfixe et longueur de masque).",
          config: `ip prefix-list <PL_NAME> seq 5 permit <NETWORK>/<PREFIX_LEN>`,
          verify: `show ip prefix-list <PL_NAME>`,
        },
        {
          title: "Écrire la route-map",
          level: "req",
          note: "Les séquences sont lues dans l'ordre. Une route-map finit par un deny implicite : la séquence 20 vide laisse passer les autres routes sans les modifier.",
          config: `route-map <MAP_NAME> permit 10
 match ip address prefix-list <PL_NAME>
 set metric <VALUE>
 set tag <TAG>
route-map <MAP_NAME> permit 20`,
          verify: `show route-map <MAP_NAME>`,
        },
        {
          title: "Redistribuer EIGRP dans OSPF",
          level: "req",
          note: "subnets est indispensable, sinon seuls les réseaux de classe entière (sans sous-réseau) passent.",
          config: `router ospf <PROCESS_ID>
 redistribute eigrp <AS_NUMBER> subnets route-map <MAP_NAME>`,
          verify: `show ip ospf database external
show ip route ospf`,
        },
        {
          title: "Redistribuer OSPF dans EIGRP",
          level: "req",
          note: "EIGRP a besoin d'une métrique de départ (bande passante, délai, fiabilité, charge, MTU). Sans elle, les routes ne sont pas annoncées.",
          config: `router eigrp <AS_NUMBER>
 redistribute ospf <PROCESS_ID> metric 100000 10 255 1 1500`,
          verify: `show ip route eigrp`,
        },
        {
          title: "Éviter les boucles avec des tags",
          level: "reco",
          note: "Avec deux points de redistribution, une route peut revenir dans son protocole d'origine. On marque chaque route redistribuée et on refuse celles qui portent déjà le tag de l'autre sens.",
          config: `route-map EIGRP_TO_OSPF deny 10
 match tag 110
route-map EIGRP_TO_OSPF permit 20
 set tag 90
route-map OSPF_TO_EIGRP deny 10
 match tag 90
route-map OSPF_TO_EIGRP permit 20
 set tag 110
router ospf <PROCESS_ID>
 redistribute eigrp <AS_NUMBER> subnets route-map EIGRP_TO_OSPF
router eigrp <AS_NUMBER>
 redistribute ospf <PROCESS_ID> metric 100000 10 255 1 1500 route-map OSPF_TO_EIGRP`,
          verify: `show ip route <NETWORK>`,
        },
        {
          title: "Routage selon la source (PBR)",
          level: "opt",
          note: "Une route-map peut aussi forcer un chemin pour un trafic choisi, sans tenir compte de la table de routage. Elle s'applique sur l'interface d'entrée.",
          config: `route-map PBR permit 10
 match ip address <ACL_NAME>
 set ip next-hop <NEXT_HOP>
interface <INTERFACE>
 ip policy route-map PBR`,
          verify: `show ip policy
show route-map PBR`,
        },
      ],
      pitfalls: [
        "Deny implicite en fin de route-map : sans séquence permit finale, les routes non sélectionnées sont rejetées.",
        "Oublier subnets dans OSPF : les sous-réseaux ne sont pas redistribués.",
        "Pas de métrique de départ dans EIGRP : les routes redistribuées sont ignorées.",
        "Redistribution mutuelle à plusieurs endroits sans tags : boucles de routage et routes instables.",
      ],
    },
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
    id: "vrf",
    requires: ["interfaces"],
    guide: {
      steps: [
        {
          title: "Créer la VRF",
          level: "req",
          note: "Une table de routage séparée. Les réseaux de deux VRF peuvent utiliser les mêmes adresses sans conflit.",
          config: `vrf definition <VRF_NAME>
 address-family ipv4`,
          verify: `show vrf`,
        },
        {
          title: "Placer les interfaces dans la VRF",
          level: "req",
          note: "vrf forwarding efface l'adresse IP de l'interface : configure-la après.",
          config: `interface <INTERFACE>
 vrf forwarding <VRF_NAME>
 ip address <IP_ADDRESS> <SUBNET_MASK>
 no shutdown`,
          verify: `show ip interface brief vrf <VRF_NAME>
show vrf`,
        },
        {
          title: "Routes statiques dans la VRF",
          level: "reco",
          note: "Chaque VRF a ses propres routes.",
          config: `ip route vrf <VRF_NAME> <NETWORK> <SUBNET_MASK> <NEXT_HOP>`,
          verify: `show ip route vrf <VRF_NAME>`,
        },
        {
          title: "OSPF dans la VRF",
          level: "opt",
          note: "Un processus OSPF par VRF.",
          config: `router ospf <PROCESS_ID> vrf <VRF_NAME>
 network <NETWORK> <WILDCARD> area <AREA>`,
          verify: `show ip ospf neighbor`,
        },
        {
          title: "VRF-lite sur un trunk",
          level: "opt",
          note: "Une sous-interface par VRF sur le même lien physique, pour transporter plusieurs VRF entre deux routeurs.",
          config: `interface <INTERFACE>.<VLAN_ID>
 encapsulation dot1Q <VLAN_ID>
 vrf forwarding <VRF_NAME>
 ip address <IP_ADDRESS> <SUBNET_MASK>`,
          verify: `ping vrf <VRF_NAME> <IP_ADDRESS>
traceroute vrf <VRF_NAME> <IP_ADDRESS>`,
        },
      ],
      pitfalls: [
        "vrf forwarding après l'adresse IP : l'adresse est effacée sans prévenir clairement.",
        "ping ou show ip route sans le mot-clé vrf : on regarde la table globale, pas celle de la VRF.",
        "Route statique sans vrf : elle va dans la table globale.",
      ],
    },
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
    id: "ntp",
    requires: ["basic"],
    guide: {
      steps: [
        {
          title: "Fuseau horaire et heure d'été",
          level: "reco",
          note: "Pour que les logs affichent l'heure locale. Exemple pour la France.",
          config: `clock timezone CET 1 0
clock summer-time CEST recurring last Sun Mar 2:00 last Sun Oct 3:00`,
          verify: `show clock detail`,
        },
        {
          title: "Synchroniser l'heure avec NTP",
          level: "req",
          note: "Sans heure juste, les logs ne servent à rien et les certificats peuvent être refusés. La synchronisation peut prendre quelques minutes.",
          config: `ntp server <NTP_SERVER_IP>`,
          verify: `show ntp status
show ntp associations`,
        },
        {
          title: "Horodater les logs",
          level: "req",
          note: "Date, heure en millisecondes et fuseau horaire sur chaque message.",
          config: `service timestamps log datetime msec localtime show-timezone
service timestamps debug datetime msec localtime show-timezone`,
        },
        {
          title: "Envoyer les logs à un serveur Syslog",
          level: "req",
          note: "Niveau 6 (informational) et en dessous. source-interface fixe l'adresse source : choisis une loopback.",
          config: `logging host <SYSLOG_IP>
logging trap informational
logging source-interface <INTERFACE>`,
          verify: `show logging`,
        },
        {
          title: "Garder les logs en mémoire",
          level: "reco",
          note: "Permet de les relire avec show logging, même sans serveur Syslog.",
          config: `logging buffered 16384 informational`,
          verify: `show logging`,
        },
        {
          title: "Supervision SNMPv3",
          level: "reco",
          note: "v3 avec authentification et chiffrement : les communautés v2c circulent en clair.",
          config: `snmp-server group <GROUP> v3 priv
snmp-server user <USERNAME> <GROUP> v3 auth sha <AUTH_PASSWORD> priv aes 128 <PRIV_PASSWORD>`,
          verify: `show snmp user
show snmp group`,
        },
        {
          title: "Ou bien : SNMPv2c limité",
          level: "opt",
          note: "En lecture seule et limité au serveur de supervision par une ACL.",
          config: `ip access-list standard SNMP_ACL
 permit host <NMS_IP>
snmp-server community <COMMUNITY> ro SNMP_ACL`,
          verify: `show snmp community`,
        },
        {
          title: "Authentifier NTP",
          level: "opt",
          note: "Empêche un faux serveur NTP de dérégler l'horloge.",
          config: `ntp authenticate
ntp authentication-key 1 md5 <KEY>
ntp trusted-key 1
ntp server <NTP_SERVER_IP> key 1`,
          verify: `show ntp associations detail`,
        },
      ],
      pitfalls: [
        "Horloge non synchronisée : impossible de recouper les logs de plusieurs équipements.",
        "Communauté SNMP public ou private : ce sont les premières testées par un attaquant.",
        "SNMP en rw sans ACL : n'importe qui connaissant la communauté peut modifier la configuration.",
        "logging trap debugging en production : le serveur Syslog est inondé.",
      ],
    },
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
    id: "aaa",
    requires: ["ssh"],
    guide: {
      steps: [
        {
          title: "Créer un compte local de secours",
          level: "req",
          note: "À faire avant aaa new-model : dès cette commande, les lignes VTY demandent un compte local. Il servira aussi si le serveur ne répond plus.",
          config: `username <USERNAME> privilege 15 secret <PASSWORD>`,
          verify: `show running-config | include username`,
        },
        {
          title: "Activer AAA",
          level: "req",
          note: "Remplace l'authentification classique des lignes par les listes de méthodes AAA.",
          config: `aaa new-model`,
          verify: `show running-config | section aaa`,
        },
        {
          title: "Déclarer le serveur RADIUS",
          level: "req",
          note: "Le secret doit être identique sur le serveur. Ports standards : 1812 (authentification) et 1813 (comptabilité).",
          config: `radius server <NAME>
 address ipv4 <SERVER_IP> auth-port 1812 acct-port 1813
 key <SECRET>`,
          verify: `show aaa servers`,
        },
        {
          title: "Regrouper les serveurs",
          level: "reco",
          note: "Le groupe permet d'avoir plusieurs serveurs. L'adresse source doit être celle déclarée comme client sur le serveur.",
          config: `aaa group server radius <GROUP_NAME>
 server name <NAME>
ip radius source-interface <INTERFACE>`,
          verify: `show aaa servers`,
        },
        {
          title: "Méthodes d'authentification",
          level: "req",
          note: "Serveur d'abord, comptes locaux si le serveur ne répond pas. La console garde une liste séparée, en local : on peut toujours se connecter en cas de panne réseau.",
          config: `aaa authentication login default group <GROUP_NAME> local
aaa authentication login CONSOLE local
line console 0
 login authentication CONSOLE`,
          verify: `test aaa group <GROUP_NAME> <USERNAME> <PASSWORD> new-code`,
        },
        {
          title: "Autorisation et comptabilité",
          level: "reco",
          note: "Le serveur décide du niveau de privilège, et garde une trace des connexions.",
          config: `aaa authorization exec default group <GROUP_NAME> local
aaa accounting exec default start-stop group <GROUP_NAME>`,
          verify: `show aaa sessions`,
        },
        {
          title: "Ou bien : TACACS+",
          level: "opt",
          note: "Chiffre tout le paquet et permet d'autoriser commande par commande. Plutôt pour l'administration des équipements, RADIUS pour l'accès des utilisateurs.",
          config: `tacacs server <NAME>
 address ipv4 <SERVER_IP>
 key <SECRET>
aaa authentication login default group tacacs+ local
aaa authorization commands 15 default group tacacs+ local`,
          verify: `show tacacs`,
        },
      ],
      pitfalls: [
        "aaa new-model sans compte local : plus personne ne peut se connecter en SSH.",
        "Secret différent sur le serveur : toutes les authentifications échouent.",
        "La méthode local n'est utilisée que si le serveur ne répond pas : un mot de passe refusé par le serveur ne bascule pas en local.",
        "Adresse source différente de celle déclarée sur le serveur : les requêtes sont ignorées.",
      ],
    },
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
 switchport private-vlan mapping <PRIMARY_VLAN> <SECONDARY_VLAN>
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
    id: "pvlan",
    requires: ["vlan"],
    guide: {
      steps: [
        {
          title: "Passer VTP en mode transparent",
          level: "req",
          note: "Les private VLAN ne sont acceptés qu'en mode VTP transparent (ou VTP version 3).",
          config: `vtp mode transparent`,
          verify: `show vtp status`,
        },
        {
          title: "Créer les VLAN secondaires",
          level: "req",
          note: "isolated : les ports ne parlent qu'au port promiscuous. community : les ports d'une même communauté se parlent entre eux et au promiscuous.",
          config: `vlan <ISOLATED_VLAN>
 private-vlan isolated
vlan <COMMUNITY_VLAN>
 private-vlan community`,
        },
        {
          title: "Créer le VLAN primaire et l'associer",
          level: "req",
          note: "Le VLAN primaire regroupe les VLAN secondaires.",
          config: `vlan <PRIMARY_VLAN>
 private-vlan primary
 private-vlan association <ISOLATED_VLAN>,<COMMUNITY_VLAN>`,
          verify: `show vlan private-vlan`,
        },
        {
          title: "Configurer le port promiscuous",
          level: "req",
          note: "En général le port vers le routeur ou le pare-feu : il parle à tous les ports du PVLAN.",
          config: `interface <PROMISCUOUS_INTERFACE>
 switchport mode private-vlan promiscuous
 switchport private-vlan mapping <PRIMARY_VLAN> <ISOLATED_VLAN>,<COMMUNITY_VLAN>`,
          verify: `show interfaces <PROMISCUOUS_INTERFACE> switchport`,
        },
        {
          title: "Configurer les ports hôtes",
          level: "req",
          note: "Chaque port hôte est associé au VLAN primaire et à un seul VLAN secondaire.",
          config: `interface <INTERFACE>
 switchport mode private-vlan host
 switchport private-vlan host-association <PRIMARY_VLAN> <ISOLATED_VLAN>`,
          verify: `show interfaces <INTERFACE> switchport
show vlan private-vlan`,
        },
        {
          title: "Passerelle sur un switch L3 (SVI)",
          level: "opt",
          note: "Si le routage se fait sur le switch : la SVI du VLAN primaire joue le rôle de port promiscuous.",
          config: `interface vlan <PRIMARY_VLAN>
 private-vlan mapping <ISOLATED_VLAN>,<COMMUNITY_VLAN>
 ip address <IP_ADDRESS> <SUBNET_MASK>
 no shutdown`,
          verify: `show interfaces vlan <PRIMARY_VLAN> private-vlan mapping`,
        },
      ],
      pitfalls: [
        "VTP en mode server ou client : les commandes private-vlan sont refusées.",
        "Un seul VLAN isolé par VLAN primaire (mais plusieurs VLAN communautaires possibles).",
        "Oublier un VLAN secondaire dans le mapping du port promiscuous : ses hôtes n'atteignent plus la passerelle.",
        "Tous les hôtes du PVLAN partagent le même sous-réseau IP, celui du VLAN primaire.",
      ],
    },
  },
  {
    name: "VOIP",
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
    id: "voip",
    requires: ["vlan"],
    guide: {
      steps: [
        {
          title: "Créer le VLAN voix",
          level: "req",
          note: "La voix est séparée des données : QoS et sécurité plus simples.",
          config: `vlan <VOICE_VLAN>
 name VOICE`,
          verify: `show vlan brief`,
        },
        {
          title: "Port d'accès avec voice VLAN",
          level: "req",
          note: "Le téléphone apprend le VLAN voix par CDP (ou LLDP-MED) et étiquette son trafic. Le PC branché derrière reste dans le VLAN données, sans étiquette.",
          config: `interface <INTERFACE>
 switchport mode access
 switchport access vlan <DATA_VLAN>
 switchport voice vlan <VOICE_VLAN>
 spanning-tree portfast`,
          verify: `show interfaces <INTERFACE> switchport`,
        },
        {
          title: "Activer la QoS et faire confiance au téléphone",
          level: "reco",
          note: "Le marquage CoS n'est conservé que si un téléphone Cisco est détecté par CDP : un PC ne peut pas se faire passer pour un téléphone.",
          config: `mls qos
interface <INTERFACE>
 mls qos trust device cisco-phone
 mls qos trust cos`,
          verify: `show mls qos interface <INTERFACE>`,
        },
        {
          title: "Ou bien : AutoQoS",
          level: "opt",
          note: "Génère automatiquement toute la configuration QoS pour un téléphone Cisco (files d'attente, confiance, marquage).",
          config: `interface <INTERFACE>
 auto qos voip cisco-phone`,
          verify: `show auto qos interface <INTERFACE>`,
        },
        {
          title: "Alimenter le téléphone en PoE",
          level: "opt",
          note: "auto est la valeur par défaut sur les switchs PoE.",
          config: `interface <INTERFACE>
 power inline auto`,
          verify: `show power inline <INTERFACE>`,
        },
        {
          title: "Adapter la sécurité de port",
          level: "opt",
          note: "Le téléphone et le PC ont chacun une adresse MAC ; selon les modèles, le téléphone compte aussi dans le VLAN données.",
          config: `interface <INTERFACE>
 switchport port-security maximum 3`,
          verify: `show port-security interface <INTERFACE>`,
        },
        {
          title: "Option DHCP 150 pour les téléphones",
          level: "opt",
          prompt: "R1",
          note: "Donne aux téléphones Cisco l'adresse du serveur TFTP qui contient leur configuration.",
          config: `ip dhcp pool VOICE
 network <NETWORK> <SUBNET_MASK>
 default-router <GATEWAY_IP>
 option 150 ip <TFTP_IP>`,
          verify: `show ip dhcp binding`,
        },
      ],
      pitfalls: [
        "mls qos activé sans trust : tous les marquages sont remis à 0, la voix perd sa priorité.",
        "VLAN voix non autorisé sur le trunk vers le cœur : le téléphone a un lien mais ne joint pas son serveur.",
        "CDP ou LLDP désactivé sur le port : le téléphone ne connaît pas le VLAN voix et reste dans le VLAN données.",
        "Port security avec maximum 1 : violation dès que le téléphone et le PC sont branchés.",
      ],
    },
  },
  {
    name: "GRE / IPsec",
    level: "ENCOR",
    category: "sec",
    prompt: "R1",
    description:
      "Un tunnel GRE relie deux sites comme s'ils étaient branchés par un câble direct, à travers Internet : il transporte le routage dynamique et le multicast. GRE ne chiffre rien : on le protège avec IPsec, qui assure la confidentialité et l'intégrité des paquets.",
    config: `! Tunnel GRE : interface virtuelle point à point vers l'autre site
interface tunnel<TUNNEL_ID>
 ! Adresse du réseau interne au tunnel
 ip address <TUNNEL_IP> <SUBNET_MASK>
 ! Extrémités du tunnel : les adresses publiques des deux routeurs
 tunnel source <INTERFACE>
 tunnel destination <PEER_PUBLIC_IP>
 ! Laisse la place aux en-têtes GRE et IPsec pour éviter la fragmentation
 ip mtu 1400
 ip tcp adjust-mss 1360
! IPsec : paramètres de la phase 1 (IKE)
crypto isakmp policy 10
 encryption aes 256
 hash sha256
 authentication pre-share
 group 14
! Clé partagée avec l'autre extrémité
crypto isakmp key <PRE_SHARED_KEY> address <PEER_PUBLIC_IP>
! Phase 2 : chiffrement et intégrité des données
crypto ipsec transform-set <TRANSFORM_SET> esp-aes 256 esp-sha256-hmac
 mode transport
crypto ipsec profile <IPSEC_PROFILE>
 set transform-set <TRANSFORM_SET>
! Applique IPsec au tunnel
interface tunnel<TUNNEL_ID>
 tunnel protection ipsec profile <IPSEC_PROFILE>`,
    show: `show interfaces tunnel <TUNNEL_ID>
show ip interface brief
show crypto isakmp sa
show crypto ipsec sa`,
    troubleshoot: `ping <PEER_PUBLIC_IP> source <INTERFACE>
show ip route <PEER_PUBLIC_IP>
show crypto session
show crypto ipsec sa | include encaps|decaps`,
    debug: `debug tunnel
debug crypto isakmp
debug crypto ipsec`,
    id: "gre",
    requires: ["interfaces", "static"],
    guide: {
      steps: [
        {
          title: "Vérifier que les adresses publiques se joignent",
          level: "req",
          note: "Le tunnel repose sur le réseau de transport : si les deux adresses publiques ne se joignent pas, rien ne montera. Cette étape se fait en mode privilégié.",
          config: `do ping <PEER_PUBLIC_IP> source <INTERFACE>`,
          verify: `show ip route <PEER_PUBLIC_IP>`,
        },
        {
          title: "Créer l'interface tunnel",
          level: "req",
          note: "L'adresse IP appartient au réseau interne au tunnel (un /30 suffit). La source et la destination sont les adresses publiques. À faire en miroir sur l'autre routeur.",
          config: `interface tunnel<TUNNEL_ID>
 ip address <TUNNEL_IP> <SUBNET_MASK>
 tunnel source <INTERFACE>
 tunnel destination <PEER_PUBLIC_IP>`,
          verify: `show interfaces tunnel <TUNNEL_ID>
show ip interface brief`,
        },
        {
          title: "Ajuster la MTU",
          level: "reco",
          note: "GRE ajoute 24 octets, IPsec davantage. Réduire la MTU et le MSS TCP évite la fragmentation et les sites web qui ne se chargent qu'à moitié.",
          config: `interface tunnel<TUNNEL_ID>
 ip mtu 1400
 ip tcp adjust-mss 1360`,
        },
        {
          title: "Router le trafic dans le tunnel",
          level: "req",
          note: "Une route statique vers le réseau distant, ou un protocole de routage activé sur le tunnel. N'annonce jamais le réseau de transport dans ce protocole.",
          config: `ip route <REMOTE_NETWORK> <SUBNET_MASK> tunnel<TUNNEL_ID>`,
          verify: `show ip route <REMOTE_NETWORK>`,
        },
        {
          title: "Définir IKE et la clé partagée",
          level: "reco",
          section: "Chiffrement IPsec",
          note: "La politique et la clé doivent être identiques des deux côtés. Chaque routeur indique l'adresse publique de l'autre.",
          config: `crypto isakmp policy 10
 encryption aes 256
 hash sha256
 authentication pre-share
 group 14
crypto isakmp key <PRE_SHARED_KEY> address <PEER_PUBLIC_IP>`,
          verify: `show crypto isakmp policy`,
        },
        {
          title: "Protéger le tunnel avec un profil IPsec",
          level: "reco",
          note: "Le mode transport suffit, puisque GRE encapsule déjà le paquet d'origine. Le profil s'applique directement sur l'interface tunnel, sans ACL de trafic intéressant.",
          config: `crypto ipsec transform-set <TRANSFORM_SET> esp-aes 256 esp-sha256-hmac
 mode transport
crypto ipsec profile <IPSEC_PROFILE>
 set transform-set <TRANSFORM_SET>
interface tunnel<TUNNEL_ID>
 tunnel protection ipsec profile <IPSEC_PROFILE>`,
          verify: `show crypto isakmp sa
show crypto ipsec sa`,
        },
      ],
      pitfalls: [
        "Routage récursif : la route vers la destination du tunnel est apprise par le tunnel, qui monte et tombe en boucle (%TUN-5-RECURDOWN).",
        "tunnel destination pointant sur l'adresse interne du tunnel au lieu de l'adresse publique de l'autre routeur.",
        "Tunnel up/up alors que l'autre côté est injoignable : sans keepalive ni IPsec, un tunnel GRE reste up tant que la route vers la destination existe.",
        "Politique IKE ou clé partagée différente entre les deux routeurs : la phase 1 ne monte pas (état MM_NO_STATE).",
        "MTU non ajustée : les petits paquets passent (ping), les gros sont fragmentés ou perdus.",
      ],
    },
  },
  {
    name: "QoS (MQC)",
    level: "ENCOR",
    category: "svc",
    prompt: "R1",
    description:
      "La qualité de service décide quel trafic passe en premier quand un lien est saturé. Avec la méthode MQC, on classe le trafic (class-map), on décide quoi en faire (policy-map), puis on applique la politique à une interface (service-policy). La voix et la vidéo y gagnent en délai et en stabilité.",
    config: `! 1. Classer : quel trafic appartient à quelle classe
class-map match-any <CLASS_NAME>
 match dscp ef
 match protocol rtp
! 2. Décider : traitement de chaque classe
policy-map <POLICY_NAME>
 class <CLASS_NAME>
  ! File prioritaire (LLQ), limitée à un pourcentage du lien
  priority percent <PERCENT>
 class class-default
  ! Le reste se partage la bande passante équitablement
  fair-queue
! 3. Appliquer en sortie de l'interface saturée
interface <INTERFACE>
 service-policy output <POLICY_NAME>`,
    show: `show class-map
show policy-map
show policy-map interface <INTERFACE>`,
    troubleshoot: `show policy-map interface <INTERFACE> output
show interfaces <INTERFACE> | include drops|rate
show running-config | section policy-map`,
    debug: ``,
    id: "qos",
    requires: ["interfaces", "acl"],
    guide: {
      steps: [
        {
          title: "Classer le trafic",
          level: "req",
          note: "match-any : une seule condition suffit. match-all : toutes doivent être vraies. On peut classer sur le marquage DSCP, une ACL ou un protocole reconnu.",
          config: `class-map match-any <CLASS_NAME>
 match dscp ef
 match access-group <ACL_NUMBER>`,
          verify: `show class-map`,
        },
        {
          title: "Marquer le trafic à l'entrée du réseau",
          level: "reco",
          note: "On marque au plus près de la source, une seule fois. Les équipements suivants n'ont plus qu'à lire le champ DSCP. EF (46) pour la voix, AF41 pour la vidéo, CS3 pour la signalisation.",
          config: `policy-map <MARKING_POLICY>
 class <CLASS_NAME>
  set dscp ef
interface <LAN_INTERFACE>
 service-policy input <MARKING_POLICY>`,
          verify: `show policy-map interface <LAN_INTERFACE>`,
        },
        {
          title: "Définir les files d'attente",
          level: "req",
          note: "priority crée une file à priorité stricte (LLQ) pour la voix. bandwidth garantit un minimum aux autres classes sans leur donner la priorité.",
          config: `policy-map <POLICY_NAME>
 class <CLASS_NAME>
  priority percent <PERCENT>
 class <DATA_CLASS>
  bandwidth percent <DATA_PERCENT>
 class class-default
  fair-queue`,
          verify: `show policy-map <POLICY_NAME>`,
        },
        {
          title: "Appliquer la politique en sortie",
          level: "req",
          note: "Les files d'attente ne fonctionnent qu'en sortie, sur l'interface où se produit la congestion.",
          config: `interface <INTERFACE>
 service-policy output <POLICY_NAME>`,
          verify: `show policy-map interface <INTERFACE>`,
        },
        {
          title: "Lisser le débit (shaping)",
          level: "opt",
          note: "Quand l'opérateur limite le débit en dessous de la vitesse du port, le shaping retient le trafic en excès au lieu de le laisser jeter. La politique de files s'imbrique dans le shaper.",
          config: `policy-map <SHAPER_NAME>
 class class-default
  shape average <RATE_BPS>
  service-policy <POLICY_NAME>
interface <INTERFACE>
 service-policy output <SHAPER_NAME>`,
          verify: `show policy-map interface <INTERFACE>`,
        },
        {
          title: "Limiter un trafic (policing)",
          level: "opt",
          note: "Le policing jette ou re-marque immédiatement ce qui dépasse le débit autorisé. Il s'applique en entrée comme en sortie.",
          config: `policy-map <POLICER_NAME>
 class <CLASS_NAME>
  police <RATE_BPS> conform-action transmit exceed-action drop
interface <INTERFACE>
 service-policy input <POLICER_NAME>`,
          verify: `show policy-map interface <INTERFACE>`,
        },
      ],
      pitfalls: [
        "Politique de files d'attente appliquée en entrée : IOS la refuse, les files n'existent qu'en sortie.",
        "Confondre priority (priorité stricte, avec limite) et bandwidth (minimum garanti, sans priorité).",
        "Trop de trafic dans la file prioritaire : ce qui dépasse la limite est jeté en cas de congestion.",
        "Marquage non conservé : un équipement intermédiaire qui ne fait pas confiance au DSCP le remet à 0.",
        "Compteurs à zéro dans show policy-map interface : le trafic ne correspond à aucune class-map.",
      ],
    },
  },
  {
    name: "Multicast / PIM",
    level: "ENCOR",
    category: "",
    prompt: "R1",
    description:
      "Le multicast envoie un même flux à un groupe de récepteurs intéressés, sans inonder tout le réseau comme un broadcast. Les hôtes s'abonnent à un groupe avec IGMP, et les routeurs construisent l'arbre de diffusion avec PIM. En sparse mode, ils se retrouvent autour d'un point de rendez-vous (RP).",
    config: `! Active le routage multicast (désactivé par défaut)
ip multicast-routing
! Adresse du point de rendez-vous, identique sur tous les routeurs
ip pim rp-address <RP_ADDRESS>
interface <INTERFACE>
 ! PIM sparse mode sur chaque interface du chemin, y compris vers les hôtes
 ip pim sparse-mode
! Version d'IGMP côté hôtes (2 par défaut, 3 pour SSM)
interface <LAN_INTERFACE>
 ip igmp version 3`,
    show: `show ip mroute
show ip pim neighbor
show ip pim interface
show ip pim rp mapping
show ip igmp groups
show ip igmp interface <LAN_INTERFACE>`,
    troubleshoot: `show ip rpf <SOURCE_IP>
show ip mroute <GROUP_ADDRESS>
show ip mroute count
mtrace <SOURCE_IP> <GROUP_ADDRESS>`,
    debug: `debug ip pim
debug ip igmp`,
    id: "multicast",
    requires: ["interfaces", "ospf"],
    guide: {
      steps: [
        {
          title: "Activer le routage multicast",
          level: "req",
          note: "Sans cette commande, le routeur ignore le trafic multicast. Sur certains switchs de niveau 3, la commande est ip multicast-routing distributed.",
          config: `ip multicast-routing`,
          verify: `show ip multicast`,
        },
        {
          title: "Activer PIM sur les interfaces",
          level: "req",
          note: "Sur toutes les interfaces du chemin : entre routeurs, vers la source et vers les récepteurs. PIM active aussi IGMP sur l'interface.",
          config: `interface <INTERFACE>
 ip pim sparse-mode`,
          verify: `show ip pim interface
show ip pim neighbor`,
        },
        {
          title: "Déclarer le point de rendez-vous",
          level: "req",
          note: "La même adresse sur tous les routeurs, y compris sur le RP lui-même. On prend en général une loopback, annoncée dans l'IGP.",
          config: `ip pim rp-address <RP_ADDRESS>`,
          verify: `show ip pim rp mapping`,
        },
        {
          title: "Vérifier l'abonnement des hôtes",
          level: "reco",
          note: "Pour tester sans récepteur réel, une interface du routeur peut s'abonner elle-même au groupe : elle répondra aux pings multicast.",
          config: `interface <LAN_INTERFACE>
 ip igmp join-group <GROUP_ADDRESS>`,
          verify: `show ip igmp groups
show ip mroute <GROUP_ADDRESS>`,
        },
        {
          title: "Élire le RP automatiquement (BSR)",
          level: "opt",
          note: "Évite de configurer l'adresse du RP à la main partout : un routeur se porte candidat RP, un autre diffuse l'information.",
          config: `ip pim bsr-candidate loopback0
ip pim rp-candidate loopback0`,
          verify: `show ip pim bsr-router
show ip pim rp mapping`,
        },
      ],
      pitfalls: [
        "Échec RPF : le flux arrive par une interface qui n'est pas celle que la table de routage unicast utilise pour joindre la source. Il est jeté.",
        "PIM oublié sur une interface du chemin : l'arbre est coupé à cet endroit.",
        "Adresse de RP différente ou absente sur un routeur : les récepteurs derrière lui ne reçoivent rien.",
        "RP injoignable en unicast : son adresse doit être annoncée dans l'IGP.",
        "TTL à 1 côté source : le flux ne dépasse pas le premier routeur.",
      ],
    },
  },
  {
    name: "Wireless (WLC 9800)",
    level: "ENCOR",
    category: "",
    prompt: "WLC",
    description:
      "Dans un réseau Wi-Fi d'entreprise, les bornes sont pilotées par un contrôleur (WLC) à travers un tunnel CAPWAP. Sur un Catalyst 9800, un SSID se construit en trois briques : le WLAN (nom et sécurité), le profil de politique (VLAN des clients) et le tag qui relie les deux et qu'on attribue aux bornes.",
    config: `! 1. Le WLAN : nom du profil, identifiant et SSID diffusé
wlan <WLAN_NAME> <WLAN_ID> <SSID>
 ! WPA2 avec clé partagée (remplace 802.1X, activé par défaut)
 no security wpa akm dot1x
 security wpa akm psk
 security wpa psk set-key ascii 0 <PRE_SHARED_KEY>
 no shutdown
! 2. Le profil de politique : VLAN dans lequel arrivent les clients
wireless profile policy <POLICY_NAME>
 vlan <VLAN_ID>
 no shutdown
! 3. Le tag : associe le WLAN au profil de politique
wireless tag policy <TAG_NAME>
 wlan <WLAN_NAME> policy <POLICY_NAME>
! 4. Attribue le tag à une borne (adresse MAC Ethernet de la borne)
ap <AP_MAC>
 policy-tag <TAG_NAME>`,
    show: `show wlan summary
show ap summary
show ap tag summary
show wireless client summary
show wireless profile policy summary
show wireless tag policy summary`,
    troubleshoot: `show wireless client mac-address <CLIENT_MAC> detail
show ap name <AP_NAME> config general
show wireless stats client delete reasons
show ap join stats summary`,
    debug: ``,
    id: "wireless",
    requires: ["vlan", "trunk", "dhcp"],
    guide: {
      steps: [
        {
          title: "Préparer le VLAN des clients",
          level: "req",
          note: "Le VLAN doit exister sur le contrôleur et passer sur le trunk qui le relie au réseau. Les clients y recevront leur adresse par DHCP.",
          config: `vlan <VLAN_ID>
 name <VLAN_NAME>
interface <UPLINK_INTERFACE>
 switchport mode trunk
 switchport trunk allowed vlan add <VLAN_ID>`,
          verify: `show vlan brief
show interfaces trunk`,
        },
        {
          title: "Créer le WLAN",
          level: "req",
          note: "Le nom du profil et le SSID peuvent être différents. Un WLAN est créé désactivé, et en WPA2 802.1X par défaut : on bascule ici sur une clé partagée.",
          config: `wlan <WLAN_NAME> <WLAN_ID> <SSID>
 no security wpa akm dot1x
 security wpa akm psk
 security wpa psk set-key ascii 0 <PRE_SHARED_KEY>
 no shutdown`,
          verify: `show wlan summary`,
        },
        {
          title: "Créer le profil de politique",
          level: "req",
          note: "Il indique dans quel VLAN placer les clients. Lui aussi est créé désactivé.",
          config: `wireless profile policy <POLICY_NAME>
 vlan <VLAN_ID>
 no shutdown`,
          verify: `show wireless profile policy summary`,
        },
        {
          title: "Relier WLAN et politique dans un tag",
          level: "req",
          note: "Sans tag, le WLAN n'est diffusé par aucune borne.",
          config: `wireless tag policy <TAG_NAME>
 wlan <WLAN_NAME> policy <POLICY_NAME>`,
          verify: `show wireless tag policy summary`,
        },
        {
          title: "Attribuer le tag aux bornes",
          level: "req",
          note: "La borne redémarre sa connexion CAPWAP en changeant de tag : attends-toi à une courte coupure.",
          config: `ap <AP_MAC>
 policy-tag <TAG_NAME>`,
          verify: `show ap tag summary
show ap summary`,
        },
        {
          title: "Vérifier la connexion d'un client",
          level: "reco",
          note: "L'état Run indique un client authentifié qui a obtenu son adresse IP. Cette étape se fait en mode privilégié.",
          config: `do show wireless client summary`,
          verify: `show wireless client mac-address <CLIENT_MAC> detail`,
        },
      ],
      pitfalls: [
        "WLAN ou profil de politique laissé en shutdown : le SSID n'apparaît pas.",
        "Tag créé mais attribué à aucune borne : elles gardent le tag par défaut et ne diffusent pas le SSID.",
        "VLAN des clients absent du trunk du contrôleur : les clients s'associent mais n'obtiennent pas d'adresse IP.",
        "Borne qui ne rejoint pas le contrôleur : vérifie l'option DHCP 43 ou l'entrée DNS CISCO-CAPWAP-CONTROLLER, et les ports UDP 5246 et 5247.",
        "Heure fausse sur le contrôleur : les certificats des bornes sont refusés.",
      ],
    },
  },
  {
    name: "SD-WAN (WAN Edge)",
    level: "ENCOR",
    category: "",
    prompt: "Edge1",
    description:
      "Cisco SD-WAN sépare les rôles : vManage administre, vBond met en relation et authentifie, vSmart distribue les routes et les politiques (protocole OMP), et les routeurs WAN Edge transportent les données dans des tunnels IPsec. En production, la configuration vient des modèles de vManage : le CLI sert surtout au premier démarrage et au diagnostic.",
    config: `! Sur un routeur IOS-XE SD-WAN, on configure en transaction, validée par commit
config-transaction
! Identité du routeur dans la fabrique
system
 system-ip <SYSTEM_IP>
 site-id <SITE_ID>
 organization-name <ORG_NAME>
 vbond <VBOND_ADDRESS>
! Interface de transport et son tunnel
interface Tunnel1
 ip unnumbered <WAN_INTERFACE>
 tunnel source <WAN_INTERFACE>
 tunnel mode sdwan
sdwan
 interface <WAN_INTERFACE>
  tunnel-interface
   encapsulation ipsec
   color <COLOR>
commit`,
    show: `show sdwan control connections
show sdwan control local-properties
show sdwan bfd sessions
show sdwan omp peers
show sdwan omp routes
show sdwan running-config`,
    troubleshoot: `show sdwan control connection-history
show sdwan certificate serial
show sdwan tunnel statistics
ping <VBOND_ADDRESS>`,
    debug: ``,
    id: "sdwan",
    requires: ["interfaces", "static"],
    guide: {
      steps: [
        {
          title: "Joindre le vBond",
          level: "req",
          note: "Le routeur doit avoir une adresse sur son interface de transport, une route par défaut et savoir joindre le vBond. Cette étape se fait en mode privilégié.",
          config: `do ping <VBOND_ADDRESS>`,
          verify: `show ip route 0.0.0.0`,
        },
        {
          title: "Donner son identité au routeur",
          level: "req",
          note: "system-ip est un identifiant unique, pas une adresse d'interface. Le nom d'organisation doit correspondre exactement à celui des contrôleurs, majuscules comprises.",
          config: `config-transaction
system
 system-ip <SYSTEM_IP>
 site-id <SITE_ID>
 organization-name <ORG_NAME>
 vbond <VBOND_ADDRESS>
commit`,
          verify: `show sdwan control local-properties`,
        },
        {
          title: "Déclarer l'interface de transport",
          level: "req",
          note: "La couleur identifie le type de lien (biz-internet, mpls, lte…). Elle sert ensuite aux politiques de choix de chemin.",
          config: `config-transaction
interface Tunnel1
 ip unnumbered <WAN_INTERFACE>
 tunnel source <WAN_INTERFACE>
 tunnel mode sdwan
sdwan
 interface <WAN_INTERFACE>
  tunnel-interface
   encapsulation ipsec
   color <COLOR>
commit`,
          verify: `show sdwan control connections`,
        },
        {
          title: "Vérifier le plan de contrôle",
          level: "req",
          note: "Les connexions vers vSmart et vManage doivent être à l'état up. Tant que ce n'est pas le cas, aucune route ni politique n'arrive. Cette étape se fait en mode privilégié.",
          config: `do show sdwan control connections`,
          verify: `show sdwan omp peers
show sdwan control connection-history`,
        },
        {
          title: "Vérifier le plan de données",
          level: "reco",
          note: "Chaque tunnel vers un autre site est surveillé par une session BFD. Les routes des autres sites arrivent par OMP. Cette étape se fait en mode privilégié.",
          config: `do show sdwan bfd sessions`,
          verify: `show sdwan omp routes`,
        },
      ],
      pitfalls: [
        "Nom d'organisation différent de celui des contrôleurs : l'authentification échoue.",
        "Numéro de série du routeur absent de la liste autorisée dans vManage, ou certificat non installé.",
        "Heure fausse : les certificats sont jugés invalides. Synchronise l'horloge avant tout.",
        "Pare-feu ou NAT qui bloque UDP 12346 (DTLS) entre le routeur et les contrôleurs.",
        "Oublier commit : la transaction n'est jamais appliquée.",
      ],
    },
  },
  {
    name: "NETCONF / RESTCONF / EEM",
    level: "ENCOR",
    category: "svc",
    prompt: "R1",
    description:
      "L'automatisation remplace la saisie manuelle par des programmes. NETCONF (sur SSH) et RESTCONF (sur HTTPS) exposent la configuration sous forme de données structurées, décrites par des modèles YANG. EEM, lui, exécute des actions directement sur l'équipement quand un événement se produit.",
    config: `! Compte de niveau 15 utilisé par les API
username <USERNAME> privilege 15 secret <PASSWORD>
! NETCONF : SSH sur le port 830, données en XML
netconf-yang
! RESTCONF : HTTPS, données en JSON ou XML
ip http secure-server
ip http authentication local
restconf
! EEM : exécute des commandes quand un message syslog apparaît
event manager applet <APPLET_NAME>
 event syslog pattern "<PATTERN>"
 action 1.0 cli command "enable"
 action 2.0 cli command "<COMMAND>"
 action 3.0 syslog msg "<MESSAGE>"`,
    show: `show netconf-yang sessions
show netconf-yang datastores
show platform software yang-management process
show ip http server status
show event manager policy registered
show event manager history events`,
    troubleshoot: `show netconf-yang statistics
show ip http server secure status
show event manager statistics policy
show logging | include HA_EM`,
    debug: `debug event manager action cli`,
    id: "auto",
    requires: ["basic", "ssh"],
    guide: {
      steps: [
        {
          title: "Créer un compte pour les API",
          level: "req",
          note: "NETCONF et RESTCONF exigent un compte de niveau de privilège 15.",
          config: `username <USERNAME> privilege 15 secret <PASSWORD>`,
          verify: `show running-config | include username`,
        },
        {
          title: "Activer NETCONF",
          level: "req",
          section: "API",
          note: "Le service écoute en SSH sur le port 830. Test depuis un poste : ssh -p 830 <USERNAME>@<IP_ADDRESS> -s netconf. Le routeur répond par la liste de ses capacités.",
          config: `netconf-yang`,
          verify: `show platform software yang-management process
show netconf-yang sessions`,
        },
        {
          title: "Activer RESTCONF",
          level: "reco",
          note: "RESTCONF passe par le serveur HTTPS de l'équipement. Les verbes HTTP correspondent aux opérations : GET lit, POST crée, PUT remplace, PATCH modifie, DELETE supprime. Point d'entrée : https://<IP_ADDRESS>/restconf/data/",
          config: `ip http secure-server
ip http authentication local
restconf`,
          verify: `show ip http server secure status
show platform software yang-management process`,
        },
        {
          title: "Réagir à un événement avec EEM",
          level: "opt",
          section: "Automatisation embarquée",
          note: "Les commandes de l'applet partent du mode utilisateur : commence par enable, puis configure terminal si tu modifies la configuration.",
          config: `event manager applet <APPLET_NAME>
 event syslog pattern "<PATTERN>"
 action 1.0 cli command "enable"
 action 2.0 cli command "<COMMAND>"
 action 3.0 syslog msg "<MESSAGE>"`,
          verify: `show event manager policy registered
show event manager history events`,
        },
        {
          title: "Lancer un applet à la main",
          level: "opt",
          note: "event none crée un applet sans déclencheur, lancé avec event manager run. Pratique pour tester une suite d'actions.",
          config: `event manager applet <APPLET_NAME>
 event none
 action 1.0 cli command "enable"
 action 2.0 cli command "<COMMAND>"
do event manager run <APPLET_NAME>`,
          verify: `show event manager history events`,
        },
      ],
      pitfalls: [
        "Compte sans privilege 15 : la session NETCONF ou RESTCONF est refusée.",
        "RESTCONF sans ip http secure-server : le service ne répond pas.",
        "Port 830 ou 443 filtré par une ACL ou un pare-feu entre le poste et l'équipement.",
        "Applet EEM sans enable en première action : les commandes suivantes échouent.",
        "Motif syslog trop large : l'applet se déclenche en boucle, parfois sur ses propres messages.",
      ],
    },
  },
  {
    name: "IP SLA / Tracking",
    level: "ENCOR",
    category: "svc",
    prompt: "R1",
    description:
      "IP SLA envoie des sondes (ping, connexion TCP, requête HTTP…) pour mesurer en continu si une destination répond, et en combien de temps. Associé à un objet de suivi (track), il permet de retirer une route ou de faire basculer HSRP quand un lien fonctionne mal, même si l'interface reste up.",
    config: `! Sonde : ping vers une cible, toutes les 10 secondes
ip sla <SLA_ID>
 icmp-echo <TARGET_IP> source-interface <INTERFACE>
 frequency 10
! Démarre la sonde, sans date de fin
ip sla schedule <SLA_ID> life forever start-time now
! Objet de suivi : up tant que la sonde réussit
track <TRACK_ID> ip sla <SLA_ID> reachability
! Route conservée seulement si l'objet est up
ip route 0.0.0.0 0.0.0.0 <NEXT_HOP> track <TRACK_ID>
! Route de secours (distance administrative plus haute)
ip route 0.0.0.0 0.0.0.0 <BACKUP_NEXT_HOP> 10`,
    show: `show ip sla summary
show ip sla statistics
show ip sla configuration
show track
show track brief
show ip route static`,
    troubleshoot: `show ip sla statistics <SLA_ID>
show track <TRACK_ID>
show ip route 0.0.0.0
ping <TARGET_IP> source <INTERFACE>`,
    debug: `debug track
debug ip sla error`,
    id: "ipsla",
    requires: ["interfaces", "static"],
    guide: {
      steps: [
        {
          title: "Créer la sonde",
          level: "req",
          note: "Choisis une cible stable, située au-delà du lien à surveiller. Préciser l'interface source force la sonde à emprunter ce lien.",
          config: `ip sla <SLA_ID>
 icmp-echo <TARGET_IP> source-interface <INTERFACE>
 frequency 10`,
          verify: `show ip sla configuration`,
        },
        {
          title: "Démarrer la sonde",
          level: "req",
          note: "Une sonde configurée ne fait rien tant qu'elle n'est pas planifiée. Une fois lancée, elle ne peut plus être modifiée : il faut la supprimer et la recréer.",
          config: `ip sla schedule <SLA_ID> life forever start-time now`,
          verify: `show ip sla summary
show ip sla statistics`,
        },
        {
          title: "Créer l'objet de suivi",
          level: "req",
          note: "L'objet passe down quand la sonde échoue. Le délai évite de basculer à la moindre perte isolée.",
          config: `track <TRACK_ID> ip sla <SLA_ID> reachability
 delay down 10 up 30`,
          verify: `show track`,
        },
        {
          title: "Lier la route principale au suivi",
          level: "req",
          note: "La route est retirée de la table quand l'objet est down. La route de secours, de distance administrative plus haute, prend alors le relais.",
          config: `ip route 0.0.0.0 0.0.0.0 <NEXT_HOP> track <TRACK_ID>
ip route 0.0.0.0 0.0.0.0 <BACKUP_NEXT_HOP> 10`,
          verify: `show ip route static
show ip route 0.0.0.0`,
        },
        {
          title: "Faire basculer HSRP sur le même suivi",
          level: "opt",
          note: "Le routeur actif baisse sa priorité quand son lien montant ne fonctionne plus, et laisse la main à l'autre (qui doit avoir preempt).",
          config: `interface <LAN_INTERFACE>
 standby <GROUP> track <TRACK_ID> decrement 20`,
          verify: `show standby brief`,
        },
      ],
      pitfalls: [
        "Sonde jamais planifiée (ip sla schedule oublié) : l'objet de suivi reste down et la route n'est jamais installée.",
        "Cible de la sonde joignable aussi par le lien de secours : la sonde réussit toujours. Fixe l'interface source ou ajoute une route d'hôte vers la cible.",
        "Route de secours sans distance administrative plus haute : les deux routes sont utilisées en même temps.",
        "Surveiller l'adresse du prochain saut seulement : une panne plus loin chez l'opérateur passe inaperçue.",
      ],
    },
  },
  {
    name: "SPAN / NetFlow",
    level: "ENCOR",
    category: "svc",
    prompt: "SW1",
    description:
      "Deux façons d'observer le trafic. SPAN recopie les trames d'un port ou d'un VLAN vers un analyseur (Wireshark, sonde IDS) : on voit tout le contenu. NetFlow ne garde que des statistiques par flux (qui parle à qui, combien d'octets) et les exporte vers un collecteur : idéal pour savoir ce qui consomme la bande passante.",
    config: `! SPAN local : copie le trafic d'un port vers l'analyseur
monitor session <SESSION_ID> source interface <SOURCE_INTERFACE> both
monitor session <SESSION_ID> destination interface <DEST_INTERFACE>
! Flexible NetFlow : ce qu'on mesure
flow record <RECORD_NAME>
 match ipv4 source address
 match ipv4 destination address
 match ipv4 protocol
 collect counter bytes
 collect counter packets
! Vers quel collecteur exporter
flow exporter <EXPORTER_NAME>
 destination <COLLECTOR_IP>
 transport udp 2055
! Le moniteur relie l'enregistrement et l'exportateur
flow monitor <MONITOR_NAME>
 record <RECORD_NAME>
 exporter <EXPORTER_NAME>
! Active la mesure sur une interface
interface <INTERFACE>
 ip flow monitor <MONITOR_NAME> input`,
    show: `show monitor session all
show flow monitor <MONITOR_NAME> cache
show flow exporter statistics
show flow interface <INTERFACE>
show flow record`,
    troubleshoot: `show monitor session <SESSION_ID> detail
show flow monitor <MONITOR_NAME> statistics
show flow exporter <EXPORTER_NAME>
ping <COLLECTOR_IP>`,
    debug: ``,
    id: "span",
    requires: ["interfaces", "vlan"],
    guide: {
      steps: [
        {
          title: "SPAN local",
          level: "req",
          section: "Copier le trafic (SPAN)",
          note: "Source et destination sont sur le même switch. both copie les deux sens, rx seulement le trafic reçu, tx seulement le trafic émis. Le port de destination ne sert plus qu'à l'analyseur.",
          config: `monitor session <SESSION_ID> source interface <SOURCE_INTERFACE> both
monitor session <SESSION_ID> destination interface <DEST_INTERFACE>`,
          verify: `show monitor session all`,
        },
        {
          title: "RSPAN : switch source",
          level: "opt",
          note: "Quand l'analyseur est sur un autre switch, la copie voyage dans un VLAN dédié, à créer sur tous les switchs du chemin et à autoriser sur les trunks.",
          config: `vlan <RSPAN_VLAN>
 remote-span
monitor session <SESSION_ID> source interface <SOURCE_INTERFACE> both
monitor session <SESSION_ID> destination remote vlan <RSPAN_VLAN>`,
          verify: `show monitor session all
show vlan remote-span`,
        },
        {
          title: "RSPAN : switch de l'analyseur",
          level: "opt",
          prompt: "SW2",
          note: "Le switch distant prend le VLAN RSPAN comme source et le recopie vers le port de l'analyseur.",
          config: `vlan <RSPAN_VLAN>
 remote-span
monitor session <SESSION_ID> source remote vlan <RSPAN_VLAN>
monitor session <SESSION_ID> destination interface <DEST_INTERFACE>`,
          verify: `show monitor session all`,
        },
        {
          title: "Définir l'enregistrement et l'exportateur",
          level: "req",
          section: "Mesurer les flux (Flexible NetFlow)",
          note: "match définit ce qui distingue deux flux, collect ce qu'on compte pour chacun. L'exportateur désigne le collecteur et son port UDP.",
          config: `flow record <RECORD_NAME>
 match ipv4 source address
 match ipv4 destination address
 match ipv4 protocol
 collect counter bytes
 collect counter packets
flow exporter <EXPORTER_NAME>
 destination <COLLECTOR_IP>
 transport udp 2055`,
          verify: `show flow record
show flow exporter <EXPORTER_NAME>`,
        },
        {
          title: "Créer le moniteur et l'appliquer",
          level: "req",
          note: "Le moniteur s'applique par interface et par sens. Le cache se consulte directement sur l'équipement, même sans collecteur.",
          config: `flow monitor <MONITOR_NAME>
 record <RECORD_NAME>
 exporter <EXPORTER_NAME>
interface <INTERFACE>
 ip flow monitor <MONITOR_NAME> input`,
          verify: `show flow monitor <MONITOR_NAME> cache
show flow exporter statistics`,
        },
      ],
      pitfalls: [
        "Source et destination dans deux sessions de numéros différents : rien n'est copié.",
        "Port de destination SPAN utilisé pour autre chose : il ne transmet plus le trafic normal.",
        "VLAN RSPAN absent d'un switch du chemin ou non autorisé sur un trunk : la copie n'arrive pas.",
        "Port source beaucoup plus chargé que le port de destination : une partie de la copie est perdue.",
        "Moniteur NetFlow créé mais appliqué à aucune interface : le cache reste vide.",
      ],
    },
  },
];
